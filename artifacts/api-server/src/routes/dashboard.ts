import { Router, type IRouter } from "express";
import { count, eq, and, gte, lte, sql } from "drizzle-orm";
import { db, agenciesTable, surgeonsTable, customersTable, eventsTable, appointmentsTable, consultationRecordsTable } from "@workspace/db";
import { GetDashboardSummaryQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const qp = GetDashboardSummaryQueryParams.safeParse(req.query);
  const agencyId = qp.success ? qp.data.agencyId ?? null : null;

  const today = new Date().toISOString().split("T")[0];

  const [
    agenciesCount,
    surgeonsCount,
    customersCount,
    eventsCount,
    appointmentsCount,
    appointmentsTodayCount,
    completedCount,
    pendingCount,
    upcomingEventsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(agenciesTable).then(r => r[0].count),
    db.select({ count: count() }).from(surgeonsTable)
      .where(agencyId ? eq(surgeonsTable.agencyId, agencyId) : sql`1=1`)
      .then(r => r[0].count),
    db.select({ count: count() }).from(customersTable)
      .where(agencyId ? eq(customersTable.agencyId, agencyId) : sql`1=1`)
      .then(r => r[0].count),
    db.select({ count: count() }).from(eventsTable)
      .where(agencyId ? eq(eventsTable.agencyId, agencyId) : sql`1=1`)
      .then(r => r[0].count),
    db.select({ count: count() }).from(appointmentsTable)
      .where(agencyId ? eq(appointmentsTable.eventId, agencyId) : sql`1=1`)
      .then(r => r[0].count),
    db.select({ count: count() }).from(appointmentsTable)
      .where(and(
        gte(appointmentsTable.startTime, today + "T00:00:00"),
        lte(appointmentsTable.startTime, today + "T23:59:59"),
      ))
      .then(r => r[0].count),
    db.select({ count: count() }).from(consultationRecordsTable)
      .where(eq(consultationRecordsTable.status, "completed"))
      .then(r => r[0].count),
    db.select({ count: count() }).from(consultationRecordsTable)
      .where(eq(consultationRecordsTable.status, "in_progress"))
      .then(r => r[0].count),
    db.select({ count: count() }).from(eventsTable)
      .where(and(
        gte(eventsTable.startDate, today),
        eq(eventsTable.status, "published"),
        agencyId ? eq(eventsTable.agencyId, agencyId) : sql`1=1`
      ))
      .then(r => r[0].count),
  ]);

  res.json({
    totalAgencies: agenciesCount,
    totalSurgeons: surgeonsCount,
    totalCustomers: customersCount,
    totalEvents: eventsCount,
    totalAppointments: appointmentsCount,
    appointmentsToday: appointmentsTodayCount,
    completedConsultations: completedCount,
    pendingConsultations: pendingCount,
    upcomingEvents: upcomingEventsCount,
  });
});

router.get("/dashboard/upcoming-appointments", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const appointments = await db.select().from(appointmentsTable)
    .where(and(
      gte(appointmentsTable.startTime, today + "T00:00:00"),
      lte(appointmentsTable.startTime, nextWeek + "T23:59:59"),
      eq(appointmentsTable.status, "scheduled"),
    ))
    .orderBy(appointmentsTable.startTime)
    .limit(20);

  res.json(appointments);
});

export default router;
