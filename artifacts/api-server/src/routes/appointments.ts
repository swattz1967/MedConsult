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

const router: IRouter = Router();

router.get("/appointments", async (req, res, next): Promise<void> => {
  const qp = ListAppointmentsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success) {
    if (qp.data.eventId) conditions.push(eq(appointmentsTable.eventId, qp.data.eventId));
    if (qp.data.surgeonId) conditions.push(eq(appointmentsTable.surgeonId, qp.data.surgeonId));
    if (qp.data.customerId) conditions.push(eq(appointmentsTable.customerId, qp.data.customerId));
  }
  try {
    const rows = await (conditions.length > 0
      ? db.select().from(appointmentsTable)
          .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
          .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
          .leftJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
          .where(and(...conditions))
      : db.select().from(appointmentsTable)
          .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
          .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
          .leftJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
    );
    const appointments = rows.map(r => ({
      ...r.appointments,
      customer: r.customers,
      surgeon: r.surgeons,
      event: r.events,
    }));
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.post("/appointments", async (req, res, next): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [appt] = await db
      .insert(appointmentsTable)
      .values({ ...parsed.data, status: parsed.data.status ?? "scheduled" })
      .returning();

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
    const [surgeon]  = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, appt.surgeonId));
    const [event]    = await db.select().from(eventsTable).where(eq(eventsTable.id, appt.eventId));

    res.status(201).json({ ...appt, customer, surgeon, event });

    // Fire-and-forget emails + webhook — after response sent
    (async () => {
      const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event?.agencyId ?? -1));

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
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const rows = await db.select().from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
      .leftJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
      .where(eq(appointmentsTable.id, params.data.id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const r = rows[0];
    res.json({ ...r.appointments, customer: r.customers, surgeon: r.surgeons, event: r.events });
  } catch (err) {
    next(err);
  }
});

router.patch("/appointments/:id", async (req, res, next): Promise<void> => {
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
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
