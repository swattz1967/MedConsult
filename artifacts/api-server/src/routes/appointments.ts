import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, appointmentsTable, customersTable, surgeonsTable, eventsTable, agenciesTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
} from "@workspace/api-zod";
import {
  sendBookingConfirmation,
  sendNewBookingAlert,
  sendRescheduleNotification,
  sendStatusChangeNotification,
} from "../lib/email";
import { dispatchWebhook } from "../lib/webhook";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

async function getAppointmentAgencyId(appointmentId: number): Promise<number | null> {
  const rows = await db
    .select({ agencyId: eventsTable.agencyId })
    .from(appointmentsTable)
    .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
    .where(eq(appointmentsTable.id, appointmentId));
  return rows[0]?.agencyId ?? null;
}

router.get("/appointments", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Customer path: return only this customer's own appointments
  if (!isAdminOrOwner(req.currentUser)) {
    const customerOwnId = req.currentUser.customerId;
    if (!customerOwnId) {
      res.json([]);
      return;
    }
    try {
      const rows = await db.select().from(appointmentsTable)
        .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
        .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
        .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
        .where(eq(appointmentsTable.customerId, customerOwnId));
      res.json(rows.map(r => ({ ...r.appointments, customer: r.customers, surgeon: r.surgeons, event: r.events })));
    } catch (err) {
      next(err);
    }
    return;
  }

  // Admin / app_owner path
  const qp = ListAppointmentsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success) {
    if (qp.data.eventId) conditions.push(eq(appointmentsTable.eventId, qp.data.eventId));
    if (qp.data.surgeonId) conditions.push(eq(appointmentsTable.surgeonId, qp.data.surgeonId));
    if (qp.data.customerId) conditions.push(eq(appointmentsTable.customerId, qp.data.customerId));
  }

  if (!isAppOwner(req.currentUser)) {
    if (!req.currentUser.agencyId) {
      res.status(403).json({ error: "Forbidden: no agency associated with this account" });
      return;
    }
    conditions.push(eq(eventsTable.agencyId, req.currentUser.agencyId));
  }

  try {
    const rows = await (conditions.length > 0
      ? db.select().from(appointmentsTable)
          .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
          .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
          .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
          .where(and(...conditions))
      : db.select().from(appointmentsTable)
          .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
          .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
          .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
    );
    res.json(rows.map(r => ({ ...r.appointments, customer: r.customers, surgeon: r.surgeons, event: r.events })));
  } catch (err) {
    next(err);
  }
});

router.post("/appointments", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, parsed.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    const [customerCheck] = await db.select({ agencyId: customersTable.agencyId })
      .from(customersTable).where(eq(customersTable.id, parsed.data.customerId));
    if (!customerCheck || customerCheck.agencyId !== event.agencyId) {
      res.status(400).json({ error: "Customer does not belong to this agency" });
      return;
    }

    const [surgeonCheck] = await db.select({ agencyId: surgeonsTable.agencyId })
      .from(surgeonsTable).where(eq(surgeonsTable.id, parsed.data.surgeonId));
    if (!surgeonCheck || surgeonCheck.agencyId !== event.agencyId) {
      res.status(400).json({ error: "Surgeon does not belong to this agency" });
      return;
    }

    req.log.info({ customerId: parsed.data.customerId, surgeonId: parsed.data.surgeonId, eventId: parsed.data.eventId }, "Creating appointment");
    const [appt] = await db
      .insert(appointmentsTable)
      .values({ ...parsed.data, status: parsed.data.status ?? "scheduled" })
      .returning();

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
    const [surgeon]  = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, appt.surgeonId));

    req.log.info({ appointmentId: appt.id }, "Appointment created");
    res.status(201).json({ ...appt, customer, surgeon, event });

    (async () => {
      const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event.agencyId));

      if (customer?.email && surgeon?.email) {
        const agencyBranding = agency
          ? { id: agency.id, name: agency.name, color: agency.primaryColor ?? "#145c4b", logoUrl: agency.logoUrl, email: agency.email }
          : undefined;

        const emailData = {
          appointmentId: appt.id,
          startTime: appt.startTime,
          endTime: appt.endTime,
          fee: appt.fee,
          slotMinutes: appt.slotMinutes,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email!,
          surgeonName: `${surgeon.firstName} ${surgeon.lastName}`,
          surgeonEmail: surgeon.email!,
          eventName: event.name,
          eventVenue: event.venue,
        };

        await sendBookingConfirmation(emailData, agencyBranding);
        await sendNewBookingAlert(emailData, agencyBranding);
      }

      await dispatchWebhook(agency?.webhookUrl, agency?.webhookSecret, {
        event: "appointment.created",
        timestamp: new Date().toISOString(),
        agencyId: agency?.id ?? appt.id,
        data: {
          appointmentId: appt.id,
          customerId: appt.customerId,
          surgeonId: appt.surgeonId,
          eventId: appt.eventId,
          startTime: appt.startTime,
          endTime: appt.endTime,
          status: appt.status,
          fee: appt.fee,
          customer: customer ? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email } : null,
        },
      });
    })().catch((err) => {
      req.log.error({ err, appointmentId: appt.id }, "Failed to send booking emails/webhook");
    });
  } catch (err) {
    next(err);
  }
});

router.get("/appointments/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const rows = await db.select().from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
      .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
      .where(eq(appointmentsTable.id, params.data.id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const r = rows[0];
    if (!assertAgencyAccess(req.currentUser, r.events.agencyId, res)) return;
    res.json({ ...r.appointments, customer: r.customers, surgeon: r.surgeons, event: r.events });
  } catch (err) {
    next(err);
  }
});

router.patch("/appointments/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const apptAgencyId = await getAppointmentAgencyId(params.data.id);
    if (apptAgencyId === null) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, apptAgencyId, res)) return;

    req.log.info({ appointmentId: params.data.id }, "Updating appointment");
    const [oldAppt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    const [appt] = await db
      .update(appointmentsTable)
      .set(cleanData)
      .where(eq(appointmentsTable.id, params.data.id))
      .returning();
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
    const [surgeon]  = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, appt.surgeonId));
    const [event]    = await db.select().from(eventsTable).where(eq(eventsTable.id, appt.eventId));

    res.json({ ...appt, customer, surgeon, event });

    (async () => {
      const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event?.agencyId ?? -1));

      const timeChanged   = oldAppt && parsed.data.startTime && parsed.data.startTime !== oldAppt.startTime;
      const statusChanged = !timeChanged && parsed.data.status && oldAppt && parsed.data.status !== oldAppt.status;

      if (customer?.email && surgeon?.email && event) {
        const agencyBranding = agency
          ? { id: agency.id, name: agency.name, color: agency.primaryColor ?? "#145c4b", logoUrl: agency.logoUrl, email: agency.email }
          : undefined;

        const emailData = {
          appointmentId: appt.id,
          startTime: appt.startTime,
          endTime: appt.endTime,
          fee: appt.fee,
          slotMinutes: appt.slotMinutes,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email!,
          surgeonName: `${surgeon.firstName} ${surgeon.lastName}`,
          surgeonEmail: surgeon.email!,
          eventName: event.name,
          eventVenue: event.venue,
        };

        if (timeChanged) {
          await sendRescheduleNotification({ ...emailData, oldStartTime: oldAppt!.startTime }, "customer", agencyBranding);
          await sendRescheduleNotification({ ...emailData, oldStartTime: oldAppt!.startTime }, "surgeon", agencyBranding);
        } else if (statusChanged) {
          const notesForEmail = parsed.data.notes ?? appt.notes ?? null;
          await sendStatusChangeNotification(emailData, parsed.data.status!, "customer", notesForEmail, agencyBranding);
          await sendStatusChangeNotification(emailData, parsed.data.status!, "surgeon", notesForEmail, agencyBranding);
        }
      }

      const webhookEventType = timeChanged
        ? "appointment.rescheduled"
        : statusChanged
        ? "appointment.status_changed"
        : null;

      if (webhookEventType) {
        await dispatchWebhook(agency?.webhookUrl, agency?.webhookSecret, {
          event: webhookEventType,
          timestamp: new Date().toISOString(),
          agencyId: agency?.id ?? appt.id,
          data: {
            appointmentId: appt.id,
            customerId: appt.customerId,
            surgeonId: appt.surgeonId,
            eventId: appt.eventId,
            startTime: appt.startTime,
            endTime: appt.endTime,
            status: appt.status,
            previousStatus: statusChanged ? oldAppt?.status : undefined,
            previousStartTime: timeChanged ? oldAppt?.startTime : undefined,
            fee: appt.fee,
            customer: customer ? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email } : null,
          },
        });
      }
    })().catch((err) => {
      req.log.error({ err, appointmentId: appt.id }, "Failed to send appointment update emails/webhook");
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/appointments/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const apptAgencyId = await getAppointmentAgencyId(params.data.id);
    if (apptAgencyId === null) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, apptAgencyId, res)) return;

    req.log.info({ appointmentId: params.data.id }, "Deleting appointment");
    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
