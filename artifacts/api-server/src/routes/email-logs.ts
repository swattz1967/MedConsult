import { Router, type IRouter } from "express";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db, emailLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/email-stats", async (req, res, next): Promise<void> => {
  try {
    const rows = await db
      .select({
        agencyId:   emailLogsTable.agencyId,
        total:      sql<number>`count(*)::int`,
        sent:       sql<number>`count(case when ${emailLogsTable.status} = 'sent'   then 1 end)::int`,
        failed:     sql<number>`count(case when ${emailLogsTable.status} = 'failed' then 1 end)::int`,
        lastSentAt: sql<string | null>`max(${emailLogsTable.sentAt})`,
      })
      .from(emailLogsTable)
      .groupBy(emailLogsTable.agencyId);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/email-logs", async (req, res, next): Promise<void> => {
  try {
    const agencyId = Number(req.query.agencyId);
    if (!agencyId || isNaN(agencyId)) {
      res.status(400).json({ error: "agencyId is required" });
      return;
    }

    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(10_000, Math.max(1, Number(req.query.limit) || 50));

    const status       = typeof req.query.status       === "string" && req.query.status       ? req.query.status       : null;
    const templateType = typeof req.query.templateType === "string" && req.query.templateType ? req.query.templateType : null;
    const dateFrom     = typeof req.query.dateFrom     === "string" && req.query.dateFrom     ? req.query.dateFrom     : null;
    const dateTo       = typeof req.query.dateTo       === "string" && req.query.dateTo       ? req.query.dateTo       : null;

    const filters = [
      eq(emailLogsTable.agencyId, agencyId),
      ...(status       ? [eq(emailLogsTable.status,       status)]       : []),
      ...(templateType ? [eq(emailLogsTable.templateType, templateType)] : []),
      ...(dateFrom ? [gte(emailLogsTable.sentAt, new Date(`${dateFrom}T00:00:00.000Z`))] : []),
      ...(dateTo   ? [lte(emailLogsTable.sentAt, new Date(`${dateTo}T23:59:59.999Z`))]  : []),
    ];
    const where = filters.length === 1 ? filters[0] : and(...filters);

    const [logs, countRows] = await Promise.all([
      db.select().from(emailLogsTable).where(where)
        .orderBy(desc(emailLogsTable.sentAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)::int` }).from(emailLogsTable).where(where),
    ]);

    res.json({ logs, total: countRows[0]?.count ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
});

export default router;
