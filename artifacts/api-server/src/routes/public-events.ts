import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable, eventSurgeonsTable, surgeonsTable } from "@workspace/db";
import { GetEventParams, ListEventSurgeonsParams, GetSurgeonParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (_req, res, next): Promise<void> => {
  try {
    const events = await db.select().from(eventsTable).orderBy(eventsTable.startDate);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.get("/events/:id", async (req, res, next): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.get("/events/:eventId/surgeons", async (req, res, next): Promise<void> => {
  const params = ListEventSurgeonsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const eventSurgeons = await db
      .select()
      .from(eventSurgeonsTable)
      .where(eq(eventSurgeonsTable.eventId, params.data.eventId));
    res.json(eventSurgeons);
  } catch (err) {
    next(err);
  }
});

router.get("/surgeons/:id", async (req, res, next): Promise<void> => {
  const params = GetSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [surgeon] = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, params.data.id));
    if (!surgeon) {
      res.status(404).json({ error: "Surgeon not found" });
      return;
    }
    res.json(surgeon);
  } catch (err) {
    next(err);
  }
});

export default router;
