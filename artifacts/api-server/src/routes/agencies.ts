import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, agenciesTable } from "@workspace/db";
import {
  CreateAgencyBody,
  UpdateAgencyParams,
  UpdateAgencyBody,
  DeleteAgencyParams,
  GetAgencyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/agencies", async (_req, res): Promise<void> => {
  const agencies = await db.select().from(agenciesTable).orderBy(agenciesTable.name);
  res.json(agencies);
});

router.post("/agencies", async (req, res): Promise<void> => {
  const parsed = CreateAgencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [agency] = await db.insert(agenciesTable).values(parsed.data).returning();
  res.status(201).json(agency);
});

router.get("/agencies/:id", async (req, res): Promise<void> => {
  const params = GetAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, params.data.id));
  if (!agency) {
    res.status(404).json({ error: "Agency not found" });
    return;
  }
  res.json(agency);
});

router.patch("/agencies/:id", async (req, res): Promise<void> => {
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
  const [agency] = await db.update(agenciesTable).set(cleanData).where(eq(agenciesTable.id, params.data.id)).returning();
  if (!agency) {
    res.status(404).json({ error: "Agency not found" });
    return;
  }
  res.json(agency);
});

router.delete("/agencies/:id", async (req, res): Promise<void> => {
  const params = DeleteAgencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(agenciesTable).where(eq(agenciesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
