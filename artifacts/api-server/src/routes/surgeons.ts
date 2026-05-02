import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, surgeonsTable, proceduresTable } from "@workspace/db";
import {
  CreateSurgeonBody,
  GetSurgeonParams,
  UpdateSurgeonParams,
  UpdateSurgeonBody,
  DeleteSurgeonParams,
  ListSurgeonsQueryParams,
  CreateProcedureParams,
  CreateProcedureBody,
  UpdateProcedureParams,
  UpdateProcedureBody,
  DeleteProcedureParams,
  ListProceduresParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/surgeons", async (req, res): Promise<void> => {
  const qp = ListSurgeonsQueryParams.safeParse(req.query);
  const surgeons = qp.success && qp.data.agencyId
    ? await db.select().from(surgeonsTable).where(eq(surgeonsTable.agencyId, qp.data.agencyId))
    : await db.select().from(surgeonsTable);
  res.json(surgeons);
});

router.post("/surgeons", async (req, res): Promise<void> => {
  const parsed = CreateSurgeonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [surgeon] = await db.insert(surgeonsTable).values(parsed.data).returning();
  res.status(201).json(surgeon);
});

router.get("/surgeons/:id", async (req, res): Promise<void> => {
  const params = GetSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [surgeon] = await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, params.data.id));
  if (!surgeon) {
    res.status(404).json({ error: "Surgeon not found" });
    return;
  }
  res.json(surgeon);
});

router.patch("/surgeons/:id", async (req, res): Promise<void> => {
  const params = UpdateSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSurgeonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [surgeon] = await db.update(surgeonsTable).set(cleanData).where(eq(surgeonsTable.id, params.data.id)).returning();
  if (!surgeon) {
    res.status(404).json({ error: "Surgeon not found" });
    return;
  }
  res.json(surgeon);
});

router.delete("/surgeons/:id", async (req, res): Promise<void> => {
  const params = DeleteSurgeonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(surgeonsTable).where(eq(surgeonsTable.id, params.data.id));
  res.sendStatus(204);
});

// --- PROCEDURES ---

router.get("/surgeons/:surgeonId/procedures", async (req, res): Promise<void> => {
  const params = ListProceduresParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const procedures = await db.select().from(proceduresTable).where(eq(proceduresTable.surgeonId, params.data.surgeonId));
  res.json(procedures);
});

router.post("/surgeons/:surgeonId/procedures", async (req, res): Promise<void> => {
  const params = CreateProcedureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateProcedureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [procedure] = await db.insert(proceduresTable).values({ ...parsed.data, surgeonId: params.data.surgeonId }).returning();
  res.status(201).json(procedure);
});

router.patch("/surgeons/:surgeonId/procedures/:id", async (req, res): Promise<void> => {
  const params = UpdateProcedureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProcedureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [procedure] = await db.update(proceduresTable).set(cleanData)
    .where(and(eq(proceduresTable.id, params.data.id), eq(proceduresTable.surgeonId, params.data.surgeonId)))
    .returning();
  if (!procedure) {
    res.status(404).json({ error: "Procedure not found" });
    return;
  }
  res.json(procedure);
});

router.delete("/surgeons/:surgeonId/procedures/:id", async (req, res): Promise<void> => {
  const params = DeleteProcedureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(proceduresTable)
    .where(and(eq(proceduresTable.id, params.data.id), eq(proceduresTable.surgeonId, params.data.surgeonId)));
  res.sendStatus(204);
});

export default router;
