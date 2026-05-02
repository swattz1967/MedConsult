import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, appointmentsTable, customersTable, surgeonsTable, eventsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
} from "@workspace/api-zod";

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
