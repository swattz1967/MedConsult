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

router.get("/surgeons", async (req, res, next): Promise<void> => {
  try {
    const qp = ListSurgeonsQueryParams.safeParse(req.query);
    const surgeons = qp.success && qp.data.agencyId
      ? await db.select().from(surgeonsTable).where(eq(surgeonsTable.agencyId, qp.data.agencyId))
      : await db.select().from(surgeonsTable);
    res.json(surgeons);
  } catch (err) {
    next(err);
  }
});

router.post("/surgeons", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateSurgeonBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    req.log.info({ agencyId: parsed.data.agencyId }, "Creating surgeon");
    const [surgeon] = await db.insert(surgeonsTable).values(parsed.data).returning();
    req.log.info({ surgeonId: surgeon.id }, "Surgeon created");
    res.status(201).json(surgeon);
  } catch (err) {
    next(err);
  }
});

router.get("/surgeons/:id", async (req, res, next): Promise<void> => {
  try {
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
  } catch (err) {
    next(err);
  }
});

router.patch("/surgeons/:id", async (req, res, next): Promise<void> => {
  try {
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
    req.log.info({ surgeonId: params.data.id }, "Updating surgeon");
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
  } catch (err) {
    next(err);
  }
});

router.delete("/surgeons/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteSurgeonParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    req.log.info({ surgeonId: params.data.id }, "Deleting surgeon");
    await db.delete(surgeonsTable).where(eq(surgeonsTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- PROCEDURES ---

router.get("/surgeons/:surgeonId/procedures", async (req, res, next): Promise<void> => {
  try {
    const params = ListProceduresParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const procedures = await db.select().from(proceduresTable).where(eq(proceduresTable.surgeonId, params.data.surgeonId));
    res.json(procedures);
  } catch (err) {
    next(err);
  }
});

router.post("/surgeons/:surgeonId/procedures", async (req, res, next): Promise<void> => {
  try {
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
    req.log.info({ surgeonId: params.data.surgeonId }, "Adding procedure to surgeon");
    const [procedure] = await db.insert(proceduresTable).values({ ...parsed.data, surgeonId: params.data.surgeonId }).returning();
    req.log.info({ procedureId: procedure.id, surgeonId: params.data.surgeonId }, "Procedure added");
    res.status(201).json(procedure);
  } catch (err) {
    next(err);
  }
});

router.patch("/surgeons/:surgeonId/procedures/:id", async (req, res, next): Promise<void> => {
  try {
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
    req.log.info({ procedureId: params.data.id, surgeonId: params.data.surgeonId }, "Updating procedure");
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
  } catch (err) {
    next(err);
  }
});

router.delete("/surgeons/:surgeonId/procedures/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteProcedureParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    req.log.info({ procedureId: params.data.id, surgeonId: params.data.surgeonId }, "Deleting procedure");
    await db.delete(proceduresTable)
      .where(and(eq(proceduresTable.id, params.data.id), eq(proceduresTable.surgeonId, params.data.surgeonId)));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
