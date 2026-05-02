import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, consultationRecordsTable, consultationMediaTable } from "@workspace/db";
import {
  CreateConsultationRecordBody,
  GetConsultationRecordParams,
  UpdateConsultationRecordParams,
  UpdateConsultationRecordBody,
  ListConsultationRecordsQueryParams,
  ListConsultationMediaParams,
  AddConsultationMediaParams,
  AddConsultationMediaBody,
  DeleteConsultationMediaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// --- CONSULTATION RECORDS ---

router.get("/consultation-records", async (req, res): Promise<void> => {
  const qp = ListConsultationRecordsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success) {
    if (qp.data.appointmentId) conditions.push(eq(consultationRecordsTable.appointmentId, qp.data.appointmentId));
    if (qp.data.customerId) conditions.push(eq(consultationRecordsTable.customerId, qp.data.customerId));
    if (qp.data.surgeonId) conditions.push(eq(consultationRecordsTable.surgeonId, qp.data.surgeonId));
  }
  const records = conditions.length > 0
    ? await db.select().from(consultationRecordsTable).where(and(...conditions))
    : await db.select().from(consultationRecordsTable).orderBy(consultationRecordsTable.createdAt);
  res.json(records);
});

router.post("/consultation-records", async (req, res): Promise<void> => {
  const parsed = CreateConsultationRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [record] = await db.insert(consultationRecordsTable).values({ ...parsed.data, status: "in_progress" }).returning();
  res.status(201).json(record);
});

router.get("/consultation-records/:id", async (req, res): Promise<void> => {
  const params = GetConsultationRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [record] = await db.select().from(consultationRecordsTable).where(eq(consultationRecordsTable.id, params.data.id));
  if (!record) {
    res.status(404).json({ error: "Consultation record not found" });
    return;
  }
  res.json(record);
});

router.patch("/consultation-records/:id", async (req, res): Promise<void> => {
  const params = UpdateConsultationRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateConsultationRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [record] = await db.update(consultationRecordsTable).set(cleanData)
    .where(eq(consultationRecordsTable.id, params.data.id)).returning();
  if (!record) {
    res.status(404).json({ error: "Consultation record not found" });
    return;
  }
  res.json(record);
});

router.post("/consultation-records/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [record] = await db.update(consultationRecordsTable)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(consultationRecordsTable.id, id))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Consultation record not found" });
    return;
  }
  res.json(record);
});

// --- MEDIA ---

router.get("/consultation-records/:recordId/media", async (req, res): Promise<void> => {
  const params = ListConsultationMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const media = await db.select().from(consultationMediaTable)
    .where(eq(consultationMediaTable.consultationRecordId, params.data.recordId));
  res.json(media);
});

router.post("/consultation-records/:recordId/media", async (req, res): Promise<void> => {
  const params = AddConsultationMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddConsultationMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [media] = await db.insert(consultationMediaTable).values({
    ...parsed.data,
    consultationRecordId: params.data.recordId,
  }).returning();
  res.status(201).json(media);
});

router.delete("/consultation-records/:recordId/media/:id", async (req, res): Promise<void> => {
  const params = DeleteConsultationMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(consultationMediaTable)
    .where(and(
      eq(consultationMediaTable.id, params.data.id),
      eq(consultationMediaTable.consultationRecordId, params.data.recordId)
    ));
  res.sendStatus(204);
});

export default router;
