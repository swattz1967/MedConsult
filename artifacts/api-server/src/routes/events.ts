import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable, eventSurgeonsTable } from "@workspace/db";
import {
  CreateEventBody,
  GetEventParams,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
  AddEventSurgeonParams,
  AddEventSurgeonBody,
  UpdateEventSurgeonParams,
  UpdateEventSurgeonBody,
  RemoveEventSurgeonParams,
  ListEventSurgeonsParams,
} from "@workspace/api-zod";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/events", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const agencyId = isAppOwner(req.currentUser)
      ? (req.query.agencyId ? Number(req.query.agencyId) : null)
      : req.currentUser.agencyId;

    if (!isAppOwner(req.currentUser) && !agencyId) {
      res.status(403).json({ error: "Forbidden: no agency associated with this account" });
      return;
    }

    const events = agencyId
      ? await db.select().from(eventsTable).where(eq(eventsTable.agencyId, agencyId))
      : await db.select().from(eventsTable).orderBy(eventsTable.startDate);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.post("/events", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const parsed = CreateEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
    if (!agencyId) {
      res.status(400).json({ error: "No agency associated with this account" });
      return;
    }
    req.log.info({ agencyId }, "Creating event");
    const [event] = await db.insert(eventsTable).values({ ...parsed.data, agencyId, status: parsed.data.status ?? "draft" }).returning();
    req.log.info({ eventId: event.id }, "Event created");
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.get("/events/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
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
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.patch("/events/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
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
    const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    req.log.info({ eventId: params.data.id }, "Updating event");
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
  } catch (err) {
    next(err);
  }
});

router.delete("/events/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = DeleteEventParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    req.log.info({ eventId: params.data.id }, "Deleting event");
    await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- EVENT SURGEONS ---

router.get("/events/:eventId/surgeons", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = ListEventSurgeonsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    const eventSurgeons = await db.select().from(eventSurgeonsTable).where(eq(eventSurgeonsTable.eventId, params.data.eventId));
    res.json(eventSurgeons);
  } catch (err) {
    next(err);
  }
});

router.post("/events/:eventId/surgeons", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
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
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    req.log.info({ eventId: params.data.eventId, surgeonId: parsed.data.surgeonId }, "Assigning surgeon to event");
    const [es] = await db.insert(eventSurgeonsTable).values({ ...parsed.data, eventId: params.data.eventId }).returning();
    res.status(201).json(es);
  } catch (err) {
    next(err);
  }
});

router.patch("/events/:eventId/surgeons/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
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
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    req.log.info({ eventId: params.data.eventId, eventSurgeonId: params.data.id }, "Updating event surgeon");
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
  } catch (err) {
    next(err);
  }
});

router.delete("/events/:eventId/surgeons/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = RemoveEventSurgeonParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    req.log.info({ eventId: params.data.eventId, eventSurgeonId: params.data.id }, "Removing surgeon from event");
    await db.delete(eventSurgeonsTable)
      .where(and(eq(eventSurgeonsTable.id, params.data.id), eq(eventSurgeonsTable.eventId, params.data.eventId)));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
