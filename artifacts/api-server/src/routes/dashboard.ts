import { Router, type IRouter } from "express";
import { count, eq, and, gte, lte, sql } from "drizzle-orm";
import { db, agenciesTable, surgeonsTable, customersTable, eventsTable, appointmentsTable, consultationRecordsTable } from "@workspace/db";
import { isAppOwner, isAdminOrOwner } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }

  const agencyId = isAppOwner(req.currentUser)
    ? (req.query.agencyId ? Number(req.query.agencyId) : null)
    : req.currentUser.agencyId;

  if (!isAppOwner(req.currentUser) && !agencyId) {
    res.status(403).json({ error: "Forbidden: no agency associated with this account" });
    return;
  }

  try {
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
      isAppOwner(req.currentUser)
        ? db.select({ count: count() }).from(agenciesTable).then(r => r[0].count)
        : Promise.resolve(1),

      db.select({ count: count() }).from(surgeonsTable)
        .where(agencyId ? eq(surgeonsTable.agencyId, agencyId) : sql`1=1`)
        .then(r => r[0].count),

      db.select({ count: count() }).from(customersTable)
        .where(agencyId ? eq(customersTable.agencyId, agencyId) : sql`1=1`)
        .then(r => r[0].count),

      db.select({ count: count() }).from(eventsTable)
        .where(agencyId ? eq(eventsTable.agencyId, agencyId) : sql`1=1`)
        .then(r => r[0].count),

      agencyId
        ? db.select({ count: count() }).from(appointmentsTable)
            .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
            .where(eq(eventsTable.agencyId, agencyId))
            .then(r => r[0].count)
        : db.select({ count: count() }).from(appointmentsTable)
            .then(r => r[0].count),

      agencyId
        ? db.select({ count: count() }).from(appointmentsTable)
            .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
            .where(and(
              eq(eventsTable.agencyId, agencyId),
              gte(appointmentsTable.startTime, today + "T00:00:00"),
              lte(appointmentsTable.startTime, today + "T23:59:59"),
            ))
            .then(r => r[0].count)
        : db.select({ count: count() }).from(appointmentsTable)
            .where(and(
              gte(appointmentsTable.startTime, today + "T00:00:00"),
              lte(appointmentsTable.startTime, today + "T23:59:59"),
            ))
            .then(r => r[0].count),

      agencyId
        ? db.select({ count: count() }).from(consultationRecordsTable)
            .innerJoin(appointmentsTable, eq(consultationRecordsTable.appointmentId, appointmentsTable.id))
            .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
            .where(and(eq(consultationRecordsTable.status, "completed"), eq(eventsTable.agencyId, agencyId)))
            .then(r => r[0].count)
        : db.select({ count: count() }).from(consultationRecordsTable)
            .where(eq(consultationRecordsTable.status, "completed"))
            .then(r => r[0].count),

      agencyId
        ? db.select({ count: count() }).from(consultationRecordsTable)
            .innerJoin(appointmentsTable, eq(consultationRecordsTable.appointmentId, appointmentsTable.id))
            .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
            .where(and(eq(consultationRecordsTable.status, "in_progress"), eq(eventsTable.agencyId, agencyId)))
            .then(r => r[0].count)
        : db.select({ count: count() }).from(consultationRecordsTable)
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
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/upcoming-appointments", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }

  const agencyId = isAppOwner(req.currentUser)
    ? (req.query.agencyId ? Number(req.query.agencyId) : null)
    : req.currentUser.agencyId;

  if (!isAppOwner(req.currentUser) && !agencyId) {
    res.status(403).json({ error: "Forbidden: no agency associated with this account" });
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const baseConditions = and(
      gte(appointmentsTable.startTime, today + "T00:00:00"),
      lte(appointmentsTable.startTime, nextWeek + "T23:59:59"),
      eq(appointmentsTable.status, "scheduled"),
    );

    const appointments = agencyId
      ? await db.select({ appointment: appointmentsTable })
          .from(appointmentsTable)
          .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
          .where(and(baseConditions, eq(eventsTable.agencyId, agencyId)))
          .orderBy(appointmentsTable.startTime)
          .limit(20)
          .then(rows => rows.map(r => r.appointment))
      : await db.select().from(appointmentsTable)
          .where(baseConditions)
          .orderBy(appointmentsTable.startTime)
          .limit(20);

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

export default router;
