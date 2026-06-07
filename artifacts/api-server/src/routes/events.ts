import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, eventsTable, eventSurgeonsTable, eventCustomersTable, customersTable, agenciesTable, appointmentsTable, surgeonsTable } from "@workspace/db";
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
  ListEventCustomersParams,
  AddEventCustomerBody,
  RemoveEventCustomerParams,
} from "@workspace/api-zod";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";
import PDFDocument from "pdfkit";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

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

// ─── Event Customers ─────────────────────────────────────────────────────────

router.get("/events/:eventId/customers", async (req, res, next): Promise<void> => {
  if (!req.currentUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdminOrOwner(req.currentUser)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const params = ListEventCustomersParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    const rows = await db
      .select()
      .from(eventCustomersTable)
      .innerJoin(customersTable, eq(eventCustomersTable.customerId, customersTable.id))
      .where(eq(eventCustomersTable.eventId, params.data.eventId));
    res.json(rows.map((r) => ({ ...r.event_customers, customer: r.customers })));
  } catch (err) { next(err); }
});

router.post("/events/:eventId/customers", async (req, res, next): Promise<void> => {
  if (!req.currentUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdminOrOwner(req.currentUser)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const params = ListEventCustomersParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
    const parsed = AddEventCustomerBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    const [customerCheck] = await db.select({ agencyId: customersTable.agencyId })
      .from(customersTable).where(eq(customersTable.id, parsed.data.customerId));
    if (!customerCheck || customerCheck.agencyId !== event.agencyId) {
      res.status(400).json({ error: "Customer does not belong to this agency" }); return;
    }
    req.log.info({ eventId: params.data.eventId, customerId: parsed.data.customerId }, "Adding customer to event");
    const [ec] = await db.insert(eventCustomersTable)
      .values({ eventId: params.data.eventId, customerId: parsed.data.customerId })
      .returning();
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, ec.customerId));
    res.status(201).json({ ...ec, customer });
  } catch (err) { next(err); }
});

router.delete("/events/:eventId/customers/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdminOrOwner(req.currentUser)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const params = RemoveEventCustomerParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.eventId));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;
    req.log.info({ eventId: params.data.eventId, eventCustomerId: params.data.id }, "Removing customer from event");
    await db.delete(eventCustomersTable)
      .where(and(eq(eventCustomersTable.id, params.data.id), eq(eventCustomersTable.eventId, params.data.eventId)));
    res.sendStatus(204);
  } catch (err) { next(err); }
});

// --- SCHEDULE PDF ---

router.get("/events/:eventId/schedule-pdf", async (req, res, next): Promise<void> => {
  if (!req.currentUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdminOrOwner(req.currentUser)) { res.status(403).json({ error: "Forbidden" }); return; }

  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (!assertAgencyAccess(req.currentUser, event.agencyId, res)) return;

    const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, event.agencyId));

    const rows = await db
      .select({
        id: appointmentsTable.id,
        startTime: appointmentsTable.startTime,
        endTime: appointmentsTable.endTime,
        status: appointmentsTable.status,
        fee: appointmentsTable.fee,
        surgeonFirstName: surgeonsTable.firstName,
        surgeonLastName: surgeonsTable.lastName,
        customerFirstName: customersTable.firstName,
        customerLastName: customersTable.lastName,
      })
      .from(appointmentsTable)
      .innerJoin(surgeonsTable, eq(appointmentsTable.surgeonId, surgeonsTable.id))
      .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .where(eq(appointmentsTable.eventId, eventId))
      .orderBy(asc(appointmentsTable.startTime));

    const logoBuffer = agency?.logoUrl ? await objectStorageService.readLogoBuffer(agency.logoUrl) : null;

    const BRAND    = agency?.primaryColor ?? "#1a6b5c";
    const LIGHT    = "#f0f9f6";
    const GREY     = "#555555";
    const agencyName = agency?.name ?? "MedConsult";

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const PAGE_WIDTH = doc.page.width - 100;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="schedule-event-${eventId}.pdf"`);
    doc.pipe(res);

    // ── Header bar ──────────────────────────────────────────────────────────
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
    doc.fillColor("white").fontSize(13).font("Helvetica-Bold")
      .text("Appointment Schedule", 0, 28, { width: doc.page.width, align: "center" });
    doc.fillColor("white").fontSize(9).font("Helvetica")
      .text(`Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}`, 50, 46, { align: "right", width: PAGE_WIDTH });

    // ── Event heading ────────────────────────────────────────────────────────
    doc.moveDown(3.5);
    doc.fillColor("#000000").fontSize(20).font("Helvetica-Bold").text(event.name, 50, doc.y, { width: PAGE_WIDTH });
    doc.moveDown(0.4);

    const startLabel = new Date(event.startDate).toLocaleDateString("en-GB", { dateStyle: "long" });
    const endLabel   = new Date(event.endDate).toLocaleDateString("en-GB",   { dateStyle: "long" });
    doc.fillColor(GREY).fontSize(11).font("Helvetica").text(`${event.venue}  ·  ${startLabel} – ${endLabel}`, 50, doc.y, { width: PAGE_WIDTH });
    if (event.description) {
      doc.moveDown(0.4);
      doc.fillColor(GREY).fontSize(10).font("Helvetica").text(event.description, 50, doc.y, { width: PAGE_WIDTH });
    }

    doc.moveDown(1.2);
    doc.moveTo(50, doc.y).lineTo(50 + PAGE_WIDTH, doc.y).stroke(BRAND);
    doc.moveDown(0.8);

    // ── Summary stats ────────────────────────────────────────────────────────
    const total     = rows.length;
    const completed = rows.filter(r => r.status === "completed").length;
    const scheduled = rows.filter(r => r.status === "scheduled").length;

    doc.rect(50, doc.y, PAGE_WIDTH, 36).fill(LIGHT);
    const statY = doc.y + 10;
    const colW  = PAGE_WIDTH / 3;
    const stats = [
      { label: "Total Appointments", val: String(total) },
      { label: "Scheduled",          val: String(scheduled) },
      { label: "Completed",          val: String(completed) },
    ];
    stats.forEach((s, i) => {
      const x = 58 + i * colW;
      doc.fillColor(BRAND).fontSize(14).font("Helvetica-Bold").text(s.val, x, statY, { width: colW - 8 });
      doc.fillColor(GREY).fontSize(8).font("Helvetica").text(s.label, x, statY + 16, { width: colW - 8 });
    });
    doc.moveDown(2.8);

    // ── Table header ─────────────────────────────────────────────────────────
    if (rows.length === 0) {
      doc.fillColor(GREY).fontSize(11).font("Helvetica").text("No appointments have been booked for this event yet.", 50, doc.y, { width: PAGE_WIDTH });
    } else {
      const COL = { time: 50, surgeon: 170, customer: 330, status: 440, fee: 510 };
      const ROW_H = 22;

      doc.rect(50, doc.y, PAGE_WIDTH, ROW_H).fill(BRAND);
      const hY = doc.y + 6;
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
      doc.text("Time",     COL.time,    hY, { width: 115 });
      doc.text("Surgeon",  COL.surgeon,  hY, { width: 155 });
      doc.text("Customer", COL.customer, hY, { width: 105 });
      doc.text("Status",   COL.status,   hY, { width: 65 });
      doc.text("Fee",      COL.fee,      hY, { width: 45 });
      doc.moveDown(1.6);

      let shade = false;
      for (const appt of rows) {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          // repeat header bar on new page
          doc.rect(0, 0, doc.page.width, 40).fill(BRAND);
          doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
            .text(`${event.name} — Schedule (continued)`, 50, 12, { width: PAGE_WIDTH });
          doc.moveDown(2.5);

          doc.rect(50, doc.y, PAGE_WIDTH, ROW_H).fill(BRAND);
          const nhY = doc.y + 6;
          doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
          doc.text("Time",     COL.time,    nhY, { width: 115 });
          doc.text("Surgeon",  COL.surgeon,  nhY, { width: 155 });
          doc.text("Customer", COL.customer, nhY, { width: 105 });
          doc.text("Status",   COL.status,   nhY, { width: 65 });
          doc.text("Fee",      COL.fee,      nhY, { width: 45 });
          doc.moveDown(1.6);
          shade = false;
        }

        if (shade) doc.rect(50, doc.y, PAGE_WIDTH, ROW_H).fill("#f8fafc");
        shade = !shade;

        const rowY = doc.y + 5;
        const start = new Date(appt.startTime);
        const end   = new Date(appt.endTime);
        const timeStr = `${start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
        const dateStr = start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

        const statusColor =
          appt.status === "completed"  ? "#16a34a" :
          appt.status === "cancelled"  ? "#dc2626" :
          appt.status === "no_show"    ? "#9333ea" :
          "#d97706";

        doc.fillColor("#000000").fontSize(9).font("Helvetica");
        doc.text(`${dateStr}  ${timeStr}`, COL.time,    rowY, { width: 115 });
        doc.text(`${appt.surgeonFirstName} ${appt.surgeonLastName}`,   COL.surgeon,  rowY, { width: 155 });
        doc.text(`${appt.customerFirstName} ${appt.customerLastName}`, COL.customer, rowY, { width: 105 });
        doc.fillColor(statusColor).font("Helvetica-Bold")
          .text(appt.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), COL.status, rowY, { width: 65 });
        doc.fillColor(GREY).font("Helvetica")
          .text(appt.fee != null ? `${appt.fee.toFixed(0)}` : "—", COL.fee, rowY, { width: 45 });
        doc.moveDown(1.5);

        // row divider
        doc.moveTo(50, doc.y - 2).lineTo(50 + PAGE_WIDTH, doc.y - 2).stroke("#e2e8f0");
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const pageH = doc.page.height;
    doc.rect(0, pageH - 40, doc.page.width, 40).fill(BRAND);
    const footerLeft = agency?.email ? `${agencyName} — ${agency.email}` : agencyName;
    doc.fillColor("white").fontSize(9).font("Helvetica")
      .text(`${footerLeft} — Appointment Schedule — ${event.name}`, 50, pageH - 26, { align: "center", width: PAGE_WIDTH });

    doc.end();
  } catch (err) {
    req.log.error({ err, eventId }, "Error generating schedule PDF");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    } else {
      res.destroy();
    }
  }
});

export default router;
