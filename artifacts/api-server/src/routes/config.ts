import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, configItemsTable } from "@workspace/db";
import {
  CreateNationalityBody,
  CreateLanguageBody,
  CreateMedicalServiceBody,
  DeleteNationalityParams,
  DeleteLanguageParams,
  DeleteMedicalServiceParams,
} from "@workspace/api-zod";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

// --- NATIONALITIES ---

router.get("/config/nationalities", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
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

    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "nationality")];
    if (agencyId) conditions.push(eq(configItemsTable.agencyId, agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/nationalities", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateNationalityBody.safeParse({ ...req.body, type: "nationality" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
  if (!agencyId) {
    res.status(400).json({ error: "No agency associated with this account" });
    return;
  }
  if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;
  try {
    req.log.info({ agencyId, label: parsed.data.label }, "Adding nationality");
    const [item] = await db.insert(configItemsTable).values({ ...parsed.data, agencyId }).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/nationalities/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteNationalityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(configItemsTable)
      .where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "nationality")));
    if (!existing) {
      res.status(404).json({ error: "Nationality not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;
    req.log.info({ configItemId: params.data.id }, "Deleting nationality");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "nationality")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- LANGUAGES ---

router.get("/config/languages", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
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

    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "language")];
    if (agencyId) conditions.push(eq(configItemsTable.agencyId, agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/languages", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateLanguageBody.safeParse({ ...req.body, type: "language" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
  if (!agencyId) {
    res.status(400).json({ error: "No agency associated with this account" });
    return;
  }
  if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;
  try {
    req.log.info({ agencyId, label: parsed.data.label }, "Adding language");
    const [item] = await db.insert(configItemsTable).values({ ...parsed.data, agencyId }).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/languages/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteLanguageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(configItemsTable)
      .where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "language")));
    if (!existing) {
      res.status(404).json({ error: "Language not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;
    req.log.info({ configItemId: params.data.id }, "Deleting language");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "language")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- MEDICAL SERVICES ---

router.get("/config/medical-services", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
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

    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "medical_service")];
    if (agencyId) conditions.push(eq(configItemsTable.agencyId, agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/medical-services", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateMedicalServiceBody.safeParse({ ...req.body, type: "medical_service" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
  if (!agencyId) {
    res.status(400).json({ error: "No agency associated with this account" });
    return;
  }
  if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;
  try {
    req.log.info({ agencyId, label: parsed.data.label }, "Adding medical service");
    const [item] = await db.insert(configItemsTable).values({ ...parsed.data, agencyId }).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/medical-services/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteMedicalServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(configItemsTable)
      .where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "medical_service")));
    if (!existing) {
      res.status(404).json({ error: "Medical service not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;
    req.log.info({ configItemId: params.data.id }, "Deleting medical service");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "medical_service")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
