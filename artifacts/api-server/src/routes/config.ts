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
  ListNationalitiesQueryParams,
  ListLanguagesQueryParams,
  ListMedicalServicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// --- NATIONALITIES ---

router.get("/config/nationalities", async (req, res, next): Promise<void> => {
  try {
    const qp = ListNationalitiesQueryParams.safeParse(req.query);
    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "nationality")];
    if (qp.success && qp.data.agencyId) conditions.push(eq(configItemsTable.agencyId, qp.data.agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/nationalities", async (req, res, next): Promise<void> => {
  const parsed = CreateNationalityBody.safeParse({ ...req.body, type: "nationality" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: parsed.data.agencyId, label: parsed.data.label }, "Adding nationality");
    const [item] = await db.insert(configItemsTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/nationalities/:id", async (req, res, next): Promise<void> => {
  const params = DeleteNationalityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ configItemId: params.data.id }, "Deleting nationality");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "nationality")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- LANGUAGES ---

router.get("/config/languages", async (req, res, next): Promise<void> => {
  try {
    const qp = ListLanguagesQueryParams.safeParse(req.query);
    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "language")];
    if (qp.success && qp.data.agencyId) conditions.push(eq(configItemsTable.agencyId, qp.data.agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/languages", async (req, res, next): Promise<void> => {
  const parsed = CreateLanguageBody.safeParse({ ...req.body, type: "language" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: parsed.data.agencyId, label: parsed.data.label }, "Adding language");
    const [item] = await db.insert(configItemsTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/languages/:id", async (req, res, next): Promise<void> => {
  const params = DeleteLanguageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ configItemId: params.data.id }, "Deleting language");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "language")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- MEDICAL SERVICES ---

router.get("/config/medical-services", async (req, res, next): Promise<void> => {
  try {
    const qp = ListMedicalServicesQueryParams.safeParse(req.query);
    const conditions: ReturnType<typeof eq>[] = [eq(configItemsTable.type, "medical_service")];
    if (qp.success && qp.data.agencyId) conditions.push(eq(configItemsTable.agencyId, qp.data.agencyId));
    const items = await db.select().from(configItemsTable).where(and(...conditions)).orderBy(configItemsTable.label);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/config/medical-services", async (req, res, next): Promise<void> => {
  const parsed = CreateMedicalServiceBody.safeParse({ ...req.body, type: "medical_service" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: parsed.data.agencyId, label: parsed.data.label }, "Adding medical service");
    const [item] = await db.insert(configItemsTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/config/medical-services/:id", async (req, res, next): Promise<void> => {
  const params = DeleteMedicalServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ configItemId: params.data.id }, "Deleting medical service");
    await db.delete(configItemsTable).where(and(eq(configItemsTable.id, params.data.id), eq(configItemsTable.type, "medical_service")));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
