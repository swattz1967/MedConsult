import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, consultationRecordsTable, consultationMediaTable, appointmentsTable, customersTable, surgeonsTable, eventsTable, agenciesTable, uploadTokensTable } from "@workspace/db";
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
import { promises as dnsPromises } from "dns";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function ipv4ToNumber(ip: string): number {
  const p = ip.split(".").map(Number);
  return p[0] * 16777216 + p[1] * 65536 + p[2] * 256 + p[3];
}

const BLOCKED_IPV4: Array<[number, number]> = [
  [ipv4ToNumber("0.0.0.0"),     ipv4ToNumber("0.255.255.255")],
  [ipv4ToNumber("10.0.0.0"),    ipv4ToNumber("10.255.255.255")],
  [ipv4ToNumber("100.64.0.0"),  ipv4ToNumber("100.127.255.255")],
  [ipv4ToNumber("127.0.0.0"),   ipv4ToNumber("127.255.255.255")],
  [ipv4ToNumber("169.254.0.0"), ipv4ToNumber("169.254.255.255")],
  [ipv4ToNumber("172.16.0.0"),  ipv4ToNumber("172.31.255.255")],
  [ipv4ToNumber("192.0.0.0"),   ipv4ToNumber("192.0.0.255")],
  [ipv4ToNumber("192.168.0.0"), ipv4ToNumber("192.168.255.255")],
  [ipv4ToNumber("198.18.0.0"),  ipv4ToNumber("198.19.255.255")],
  [ipv4ToNumber("198.51.100.0"),ipv4ToNumber("198.51.100.255")],
  [ipv4ToNumber("203.0.113.0"), ipv4ToNumber("203.0.113.255")],
  [ipv4ToNumber("240.0.0.0"),   ipv4ToNumber("255.255.255.255")],
];

function isBlockedIPv4(ip: string): boolean {
  const n = ipv4ToNumber(ip);
  return BLOCKED_IPV4.some(([lo, hi]) => n >= lo && n <= hi);
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::" || addr === "0:0:0:0:0:0:0:0" || addr === "0:0:0:0:0:0:0:1") return true;
  if (/^fc|^fd/i.test(addr)) return true;
  if (/^fe[89ab]/i.test(addr)) return true;
  if (/^::ffff:/i.test(addr)) {
    const mapped = addr.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) return isBlockedIPv4(mapped);
    return true;
  }
  return false;
}

async function isSafeLogoUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const rawHost = url.hostname;
  const isIPv4Literal = /^\d+\.\d+\.\d+\.\d+$/.test(rawHost);
  const isIPv6Literal = rawHost.startsWith("[") || rawHost.includes(":");

  if (isIPv4Literal) {
    return !isBlockedIPv4(rawHost);
  }
  if (isIPv6Literal) {
    const bare = rawHost.replace(/^\[|\]$/g, "");
    return !isBlockedIPv6(bare);
  }

  try {
    const [v4, v6] = await Promise.all([
      dnsPromises.resolve4(rawHost).catch(() => [] as string[]),
      dnsPromises.resolve6(rawHost).catch(() => [] as string[]),
    ]);
    const all = [...v4, ...v6];
    if (all.length === 0) return false;
    for (const ip of v4) { if (isBlockedIPv4(ip)) return false; }
    for (const ip of v6) { if (isBlockedIPv6(ip)) return false; }
    return true;
  } catch {
    return false;
  }
}

async function getConsultationAgencyId(recordId: number): Promise<number | null> {
  const rows = await db
    .select({ agencyId: eventsTable.agencyId })
    .from(consultationRecordsTable)
    .innerJoin(appointmentsTable, eq(consultationRecordsTable.appointmentId, appointmentsTable.id))
    .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
    .where(eq(consultationRecordsTable.id, recordId));
  return rows[0]?.agencyId ?? null;
}

// --- CONSULTATION RECORDS ---

router.get("/consultation-records", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const qp = ListConsultationRecordsQueryParams.safeParse(req.query);
    const conditions = [];
    if (qp.success) {
      if (qp.data.appointmentId) conditions.push(eq(consultationRecordsTable.appointmentId, qp.data.appointmentId));
      if (qp.data.customerId)    conditions.push(eq(consultationRecordsTable.customerId, qp.data.customerId));
      if (qp.data.surgeonId)     conditions.push(eq(consultationRecordsTable.surgeonId, qp.data.surgeonId));
    }

    if (!isAppOwner(req.currentUser)) {
      if (!req.currentUser.agencyId) {
        res.status(403).json({ error: "Forbidden: no agency associated with this account" });
        return;
      }
      const agencyId = req.currentUser.agencyId;
      const records = await db
        .select({ record: consultationRecordsTable })
        .from(consultationRecordsTable)
        .innerJoin(appointmentsTable, eq(consultationRecordsTable.appointmentId, appointmentsTable.id))
        .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
        .where(and(eq(eventsTable.agencyId, agencyId), ...(conditions.length > 0 ? conditions : [])))
        .orderBy(consultationRecordsTable.createdAt);
      res.json(records.map(r => r.record));
      return;
    }

    const records = conditions.length > 0
      ? await db.select().from(consultationRecordsTable).where(and(...conditions))
      : await db.select().from(consultationRecordsTable).orderBy(consultationRecordsTable.createdAt);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post("/consultation-records", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateConsultationRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, parsed.data.appointmentId));
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, appointment.eventId));
    if (!event || !assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    if (parsed.data.customerId !== undefined && parsed.data.customerId !== appointment.customerId) {
      res.status(400).json({ error: "customerId does not match the appointment's customer" });
      return;
    }
    if (parsed.data.surgeonId !== undefined && parsed.data.surgeonId !== appointment.surgeonId) {
      res.status(400).json({ error: "surgeonId does not match the appointment's surgeon" });
      return;
    }

    const safeData = {
      ...parsed.data,
      customerId: appointment.customerId,
      surgeonId: appointment.surgeonId,
      status: "in_progress" as const,
    };

    req.log.info({ appointmentId: parsed.data.appointmentId, surgeonId: appointment.surgeonId ?? null }, "Creating consultation record");
    const [record] = await db.insert(consultationRecordsTable).values(safeData).returning();
    req.log.info({ consultationId: record.id }, "Consultation record created");
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.get("/consultation-records/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const raw = req.params.id;
  if (raw === "pdf") { res.status(400).json({ error: "Invalid ID" }); return; }
  const params = GetConsultationRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [record] = await db.select().from(consultationRecordsTable).where(eq(consultationRecordsTable.id, params.data.id));
    if (!record) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }
    const agencyId = await getConsultationAgencyId(record.id);
    if (agencyId !== null && !assertAgencyAccess(req.currentUser, agencyId, res)) return;
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.patch("/consultation-records/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
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
  try {
    const agencyId = await getConsultationAgencyId(params.data.id);
    if (agencyId === null) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    req.log.info({ consultationId: params.data.id }, "Updating consultation record");
    const [record] = await db
      .update(consultationRecordsTable)
      .set(cleanData)
      .where(eq(consultationRecordsTable.id, params.data.id))
      .returning();
    if (!record) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.post("/consultation-records/:id/complete", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const agencyId = await getConsultationAgencyId(id);
    if (agencyId === null) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;

    req.log.info({ consultationId: id }, "Completing consultation record");
    const [record] = await db
      .update(consultationRecordsTable)
      .set({ status: "completed", completedAt: new Date().toISOString() })
      .where(eq(consultationRecordsTable.id, id))
      .returning();
    if (!record) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// --- PDF EXPORT ---

router.get("/consultation-records/:id/pdf", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  let record, appointment, customer, surgeon, event, agency, mediaItems, logoBuffer: Buffer | null;
  try {
    [record] = await db.select().from(consultationRecordsTable).where(eq(consultationRecordsTable.id, id));
    if (!record) {
      res.status(404).json({ error: "Consultation record not found" });
      return;
    }

    [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, record.appointmentId));
    [customer]    = record.customerId ? await db.select().from(customersTable).where(eq(customersTable.id, record.customerId)) : [null];
    [surgeon]     = record.surgeonId  ? await db.select().from(surgeonsTable).where(eq(surgeonsTable.id, record.surgeonId))    : [null];
    [event]       = appointment ? await db.select().from(eventsTable).where(eq(eventsTable.id, appointment.eventId)) : [null];
    [agency]      = event ? await db.select().from(agenciesTable).where(eq(agenciesTable.id, event.agencyId)) : [null];

    if (event && !assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    mediaItems    = await db.select().from(consultationMediaTable).where(eq(consultationMediaTable.consultationRecordId, id));

    logoBuffer = null;
    if (agency?.logoUrl && (await isSafeLogoUrl(agency.logoUrl))) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const imgRes = await fetch(agency.logoUrl, {
            signal: controller.signal,
            redirect: "error",
          });
          if (imgRes.ok) {
            const contentType = imgRes.headers.get("content-type") ?? "";
            const contentLength = parseInt(imgRes.headers.get("content-length") ?? "0", 10);
            if (
              contentType.startsWith("image/") &&
              (!contentLength || contentLength <= LOGO_MAX_BYTES)
            ) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              if (buf.length <= LOGO_MAX_BYTES) logoBuffer = buf;
            }
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch { /* skip logo on fetch error */ }
    }
  } catch (err) {
    next(err);
    return;
  }

  try {
    const bmi = customer?.heightCm && customer?.weightKg
      ? (customer.weightKg / Math.pow(customer.heightCm / 100, 2)).toFixed(1)
      : null;

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="consultation-${id}.pdf"`);
    doc.pipe(res);

    const BRAND = agency?.primaryColor ?? "#1a6b5c";
    const LIGHT = "#f0f9f6";
    const GREY = "#555555";
    const PAGE_WIDTH = doc.page.width - 100;
    const agencyName = agency?.name ?? "MedConsult";

    doc.rect(0, 0, doc.page.width, 70).fill(BRAND);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 12, { height: 46, fit: [180, 46] });
      } catch {
        doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text(agencyName, 50, 20);
      }
    } else {
      doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text(agencyName, 50, 20);
    }
    doc.fillColor("white").fontSize(11).font("Helvetica").text("Consultation Record Report", 50, 46);
    doc.fillColor(BRAND).fontSize(9).font("Helvetica")
      .text(`Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}`, 50, 46, { align: "right", width: PAGE_WIDTH });

    doc.moveDown(3);

    const statusColor = record.status === "completed" ? "#16a34a" : "#d97706";
    doc.roundedRect(50, 85, 120, 24, 4).fill(statusColor);
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold").text(record.status.toUpperCase(), 50, 92, { width: 120, align: "center" });

    doc.moveDown(1.5);

    const sectionTitle = (title: string, y: number) => {
      doc.rect(50, y, PAGE_WIDTH, 22).fill(LIGHT);
      doc.fillColor(BRAND).fontSize(11).font("Helvetica-Bold").text(title, 58, y + 6);
      doc.fillColor("#000000");
    };

    const row = (label: string, value: string | null | undefined) => {
      if (!value) return;
      doc.fontSize(10).font("Helvetica-Bold").fillColor(GREY).text(label, 58, doc.y, { continued: true, width: 160 });
      doc.font("Helvetica").fillColor("#000000").text(value || "—", { width: PAGE_WIDTH - 160 });
    };

    const divider = () => {
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(50 + PAGE_WIDTH, doc.y).stroke("#e2e8f0");
      doc.moveDown(0.3);
    };

    const aptY = doc.y + 10;
    sectionTitle("Appointment Details", aptY);
    doc.moveDown(1.2);
    row("Event:", event?.name);
    row("Venue:", event?.venue);
    row("Date:", appointment ? new Date(appointment.startTime).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }) : undefined);
    row("Appointment ID:", `#${record.appointmentId}`);
    row("Record ID:", `#${record.id}`);
    row("Completed At:", record.completedAt ? new Date(record.completedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }) : undefined);
    doc.moveDown(1);
    divider();

    const patY = doc.y + 6;
    sectionTitle("Patient Information", patY);
    doc.moveDown(1.2);
    row("Full Name:", customer ? `${customer.firstName} ${customer.lastName}` : undefined);
    row("Email:", customer?.email);
    row("Phone:", customer?.dialingCode && customer?.phone ? `${customer.dialingCode} ${customer.phone}` : customer?.phone);
    row("Nationality:", customer?.nationality);
    row("Language:", customer?.preferredLanguage);
    row("Address:", customer?.address ? `${customer.address}${customer.postcode ? ", " + customer.postcode : ""}` : undefined);
    row("Medical Interests:", customer?.medicalServicesInterest);
    doc.moveDown(0.8);

    if (bmi || customer?.heightCm || customer?.weightKg) {
      doc.rect(58, doc.y, PAGE_WIDTH - 8, 48).fill("#f8fafc").stroke("#e2e8f0");
      const bmiY = doc.y + 8;
      doc.fillColor(GREY).fontSize(9).font("Helvetica-Bold").text("PHYSICAL MEASUREMENTS", 66, bmiY);
      doc.moveDown(0.4);
      const cols = [
        { label: "Height", val: customer?.heightCm ? `${customer.heightCm} cm` : "—" },
        { label: "Weight", val: customer?.weightKg ? `${customer.weightKg} kg` : "—" },
        { label: "BMI", val: bmi ?? "—" },
      ];
      const colW = (PAGE_WIDTH - 16) / 3;
      cols.forEach((c, i) => {
        const cx = 66 + i * colW;
        doc.fillColor(BRAND).fontSize(14).font("Helvetica-Bold").text(c.val, cx, doc.y - 2, { width: colW - 4 });
        doc.fillColor(GREY).fontSize(9).font("Helvetica").text(c.label, cx, doc.y - 4, { width: colW - 4 });
      });
      doc.moveDown(1.5);
    }

    doc.moveDown(0.5);
    divider();

    const surgY = doc.y + 6;
    sectionTitle("Consulting Surgeon", surgY);
    doc.moveDown(1.2);
    row("Surgeon:", surgeon ? `${surgeon.firstName} ${surgeon.lastName}` : undefined);
    row("Specialization:", surgeon?.specialization);
    row("Email:", surgeon?.email);
    doc.moveDown(1);
    divider();

    const notesY = doc.y + 6;
    sectionTitle("Consultation Notes", notesY);
    doc.moveDown(1.2);
    if (record.notes) {
      doc.fontSize(10).font("Helvetica").fillColor("#000000").text(record.notes, 58, doc.y, { width: PAGE_WIDTH - 16, lineGap: 3 });
    } else {
      doc.fontSize(10).font("Helvetica").fillColor(GREY).text("No notes recorded.", 58, doc.y);
    }
    doc.moveDown(1);
    divider();

    if (record.surgeonAnswers) {
      const obsY = doc.y + 6;
      sectionTitle("Surgeon Observations / Answers", obsY);
      doc.moveDown(1.2);
      let answers: Record<string, unknown> = {};
      try { answers = JSON.parse(record.surgeonAnswers); } catch { /* raw text fallback */ }
      if (Object.keys(answers).length > 0) {
        Object.entries(answers).forEach(([k, v]) => {
          doc.fontSize(10).font("Helvetica-Bold").fillColor(GREY).text(`Q: ${k}`, 58, doc.y, { width: PAGE_WIDTH - 16 });
          doc.fontSize(10).font("Helvetica").fillColor("#000000").text(`A: ${String(v)}`, 58, doc.y, { width: PAGE_WIDTH - 16, lineGap: 2 });
          doc.moveDown(0.4);
        });
      } else {
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(record.surgeonAnswers, 58, doc.y, { width: PAGE_WIDTH - 16, lineGap: 3 });
      }
      doc.moveDown(1);
      divider();
    }

    const mediaY = doc.y + 6;
    sectionTitle("Attachments & Media", mediaY);
    doc.moveDown(1.2);
    if (mediaItems.length === 0) {
      doc.fontSize(10).font("Helvetica").fillColor(GREY).text("No files attached.", 58, doc.y);
    } else {
      mediaItems.forEach((m, idx) => {
        const mediaTypeLabel = m.mediaType === "photo" ? "Photo" : m.mediaType === "voice_recording" ? "Voice Recording" : "Document";
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000")
          .text(`${idx + 1}. ${m.fileName}`, 58, doc.y, { continued: true, width: PAGE_WIDTH - 120 });
        doc.font("Helvetica").fillColor(GREY).text(`  [${mediaTypeLabel}]`);
      });
    }

    doc.moveDown(2);

    const pageHeight = doc.page.height;
    doc.rect(0, pageHeight - 40, doc.page.width, 40).fill(BRAND);
    const footerLeft = agency?.email ? `${agencyName} — ${agency.email}` : agencyName;
    doc.fillColor("white").fontSize(9).font("Helvetica")
      .text(`${footerLeft} — Confidential Medical Record — #${record.id}`, 50, pageHeight - 26, { align: "center", width: PAGE_WIDTH });

    doc.end();
  } catch (err) {
    req.log.error({ err, consultationId: id }, "Error during PDF generation");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    } else {
      res.destroy();
    }
  }
});

// --- MEDIA ---

router.get("/consultation-records/:recordId/media", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = ListConsultationMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const agencyId = await getConsultationAgencyId(params.data.recordId);
    if (agencyId !== null && !assertAgencyAccess(req.currentUser, agencyId, res)) return;
    const media = await db.select().from(consultationMediaTable)
      .where(eq(consultationMediaTable.consultationRecordId, params.data.recordId));
    res.json(media);
  } catch (err) {
    next(err);
  }
});

router.post("/consultation-records/:recordId/media", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
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
  // Reject objectKeys that were not generated by this server's upload flow.
  // All server-issued keys start with /objects/uploads/ followed by a UUID.
  if (!/^\/objects\/uploads\/[0-9a-f-]{36}$/.test(parsed.data.objectKey)) {
    res.status(400).json({ error: "Invalid objectKey: must be a server-issued upload key" });
    return;
  }
  try {
    const agencyId = await getConsultationAgencyId(params.data.recordId);
    if (agencyId !== null && !assertAgencyAccess(req.currentUser, agencyId, res)) return;

    // Verify the objectKey was issued by this server for the requesting user and
    // has not already been claimed (one-time use). Atomically mark it as claimed.
    const [token] = await db
      .select()
      .from(uploadTokensTable)
      .where(eq(uploadTokensTable.objectKey, parsed.data.objectKey));

    if (!token) {
      res.status(400).json({ error: "Invalid objectKey: not a recognized server-issued upload key" });
      return;
    }
    if (token.issuedByUserId !== req.currentUser!.id) {
      res.status(403).json({ error: "Forbidden: objectKey was not issued for this user" });
      return;
    }
    if (token.claimedAt !== null) {
      res.status(409).json({ error: "Conflict: objectKey has already been used" });
      return;
    }

    await db
      .update(uploadTokensTable)
      .set({ claimedAt: new Date() })
      .where(eq(uploadTokensTable.objectKey, parsed.data.objectKey));

    req.log.info({ consultationId: params.data.recordId, mediaType: parsed.data.mediaType }, "Adding consultation media");
    const [media] = await db.insert(consultationMediaTable).values({
      ...parsed.data,
      consultationRecordId: params.data.recordId,
    }).returning();
    req.log.info({ mediaId: media.id, consultationId: params.data.recordId }, "Consultation media added");
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
});

router.delete("/consultation-records/:recordId/media/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteConsultationMediaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const agencyId = await getConsultationAgencyId(params.data.recordId);
    if (agencyId !== null && !assertAgencyAccess(req.currentUser, agencyId, res)) return;

    req.log.info({ mediaId: params.data.id, consultationId: params.data.recordId }, "Deleting consultation media");
    await db.delete(consultationMediaTable)
      .where(and(
        eq(consultationMediaTable.id, params.data.id),
        eq(consultationMediaTable.consultationRecordId, params.data.recordId),
      ));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
