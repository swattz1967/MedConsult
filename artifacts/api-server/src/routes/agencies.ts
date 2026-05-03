import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, agenciesTable } from "@workspace/db";
import {
  CreateAgencyBody,
  UpdateAgencyParams,
  UpdateAgencyBody,
  DeleteAgencyParams,
  GetAgencyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/agencies", async (_req, res, next): Promise<void> => {
  try {
    const agencies = await db.select().from(agenciesTable).orderBy(agenciesTable.name);
    res.json(agencies);
  } catch (err) {
    next(err);
  }
});

router.post("/agencies", async (req, res, next): Promise<void> => {
  const parsed = CreateAgencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    req.log.info({ agencyName: parsed.data.name }, "Creating agency");
    const [agency] = await db.insert(agenciesTable).values(parsed.data).returning();
    req.log.info({ agencyId: agency.id }, "Agency created");
    res.status(201).json(agency);
  } catch (err) {
    next(err);
  }
});

router.get("/agencies/:id", async (req, res, next): Promise<void> => {
  const params = GetAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, params.data.id));
    if (!agency) {
      res.status(404).json({ error: "Agency not found" });
      return;
    }
    res.json(agency);
  } catch (err) {
    next(err);
  }
});

router.patch("/agencies/:id", async (req, res, next): Promise<void> => {
  const params = UpdateAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAgencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  try {
    req.log.info({ agencyId: params.data.id }, "Updating agency");
    const [agency] = await db
      .update(agenciesTable)
      .set(cleanData)
      .where(eq(agenciesTable.id, params.data.id))
      .returning();
    if (!agency) {
      res.status(404).json({ error: "Agency not found" });
      return;
    }
    res.json(agency);
  } catch (err) {
    next(err);
  }
});

router.post("/agencies/:id/regenerate-webhook-secret", async (req, res, next): Promise<void> => {
  const params = GetAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: params.data.id }, "Regenerating webhook secret");
    const newSecret = randomBytes(32).toString("hex");
    const [agency] = await db
      .update(agenciesTable)
      .set({ webhookSecret: newSecret })
      .where(eq(agenciesTable.id, params.data.id))
      .returning();
    if (!agency) {
      res.status(404).json({ error: "Agency not found" });
      return;
    }
    res.json({ webhookSecret: newSecret });
  } catch (err) {
    next(err);
  }
});

router.post("/agencies/:id/regenerate-api-key", async (req, res, next): Promise<void> => {
  const params = GetAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: params.data.id }, "Regenerating API key");
    const newKey = randomBytes(32).toString("hex");
    const [agency] = await db
      .update(agenciesTable)
      .set({ apiKey: newKey })
      .where(eq(agenciesTable.id, params.data.id))
      .returning();
    if (!agency) {
      res.status(404).json({ error: "Agency not found" });
      return;
    }
    res.json({ apiKey: newKey });
  } catch (err) {
    next(err);
  }
});

router.delete("/agencies/:id", async (req, res, next): Promise<void> => {
  const params = DeleteAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ agencyId: params.data.id }, "Deleting agency");
    await db.delete(agenciesTable).where(eq(agenciesTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
