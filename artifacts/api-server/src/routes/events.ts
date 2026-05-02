import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable, eventSurgeonsTable } from "@workspace/db";
import {
  CreateEventBody,
  GetEventParams,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
  ListEventsQueryParams,
  AddEventSurgeonParams,
  AddEventSurgeonBody,
  UpdateEventSurgeonParams,
  UpdateEventSurgeonBody,
  RemoveEventSurgeonParams,
  ListEventSurgeonsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const qp = ListEventsQueryParams.safeParse(req.query);
  const events = qp.success && qp.data.agencyId
    ? await db.select().from(eventsTable).where(eq(eventsTable.agencyId, qp.data.agencyId))
    : await db.select().from(eventsTable).orderBy(eventsTable.startDate);
  res.json(events);
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.insert(eventsTable).values({ ...parsed.data, status: parsed.data.status ?? "draft" }).returning();
  res.status(201).json(event);
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [event] = await db.update(eventsTable).set(cleanData).where(eq(eventsTable.id, params.data.id)).returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id));
  res.sendStatus(204);
});

// --- EVENT SURGEONS ---

router.get("/events/:eventId/surgeons", async (req, res): Promise<void> => {
  const params = ListEventSurgeonsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const eventSurgeons = await db.select().from(eventSurgeonsTable).where(eq(eventSurgeonsTable.eventId, params.data.eventId));
  res.json(eventSurgeons);
});

router.post("/events/:eventId/surgeons", async (req, res): Promise<void> => {
  const params = AddEventSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddEventSurgeonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [es] = await db.insert(eventSurgeonsTable).values({ ...parsed.data, eventId: params.data.eventId }).returning();
  res.status(201).json(es);
});

router.patch("/events/:eventId/surgeons/:id", async (req, res): Promise<void> => {
  const params = UpdateEventSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEventSurgeonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [es] = await db.update(eventSurgeonsTable).set(cleanData)
    .where(and(eq(eventSurgeonsTable.id, params.data.id), eq(eventSurgeonsTable.eventId, params.data.eventId)))
    .returning();
  if (!es) {
    res.status(404).json({ error: "Event surgeon not found" });
    return;
  }
  res.json(es);
});

router.delete("/events/:eventId/surgeons/:id", async (req, res): Promise<void> => {
  const params = RemoveEventSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(eventSurgeonsTable)
    .where(and(eq(eventSurgeonsTable.id, params.data.id), eq(eventSurgeonsTable.eventId, params.data.eventId)));
  res.sendStatus(204);
});

export default router;
