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

const router: IRouter = Router();

router.get("/appointments", async (req, res): Promise<void> => {
  const qp = ListAppointmentsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success) {
    if (qp.data.eventId) conditions.push(eq(appointmentsTable.eventId, qp.data.eventId));
    if (qp.data.surgeonId) conditions.push(eq(appointmentsTable.surgeonId, qp.data.surgeonId));
    if (qp.data.customerId) conditions.push(eq(appointmentsTable.customerId, qp.data.customerId));
  }

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
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [appt] = await db.insert(appointmentsTable).values({ ...parsed.data, status: parsed.data.status ?? "scheduled" }).returning();

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
  const [surgeon] = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, appt.surgeonId));
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, appt.eventId));

  res.status(201).json({ ...appt, customer, surgeon, event });

  // Fire-and-forget emails — after response sent
  if (customer?.email && surgeon?.email && event) {
    (async () => {
      const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event.agencyId));
      const agencyBranding = agency
        ? { name: agency.name, color: agency.primaryColor ?? "#145c4b", logoUrl: agency.logoUrl, email: agency.email }
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
    })().catch((err) => {
      req.log.error({ err, appointmentId: appt.id }, "Failed to send booking emails");
    });
  }
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
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
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
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

  const [oldAppt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));

  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [appt] = await db.update(appointmentsTable).set(cleanData).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
  const [surgeon] = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, appt.surgeonId));
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, appt.eventId));

  res.json({ ...appt, customer, surgeon, event });

  if (customer?.email && surgeon?.email && event) {
    (async () => {
      const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event.agencyId));
      const agencyBranding = agency
        ? { name: agency.name, color: agency.primaryColor ?? "#145c4b", logoUrl: agency.logoUrl, email: agency.email }
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

      const timeChanged = oldAppt && parsed.data.startTime && parsed.data.startTime !== oldAppt.startTime;
      if (timeChanged) {
        await sendRescheduleNotification({ ...emailData, oldStartTime: oldAppt!.startTime }, "customer", agencyBranding);
        await sendRescheduleNotification({ ...emailData, oldStartTime: oldAppt!.startTime }, "surgeon", agencyBranding);
      } else {
        const statusChanged = parsed.data.status && oldAppt && parsed.data.status !== oldAppt.status;
        if (statusChanged) {
          const notesForEmail = parsed.data.notes ?? appt.notes ?? null;
          await sendStatusChangeNotification(emailData, parsed.data.status!, "customer", notesForEmail, agencyBranding);
          await sendStatusChangeNotification(emailData, parsed.data.status!, "surgeon", notesForEmail, agencyBranding);
        }
      }
    })().catch((err) => {
      req.log.error({ err, appointmentId: appt.id }, "Failed to send appointment update emails");
    });
  }
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
