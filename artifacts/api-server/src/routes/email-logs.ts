import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, emailLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/email-logs", async (req, res): Promise<void> => {
  const agencyId = Number(req.query.agencyId);
  if (!agencyId || isNaN(agencyId)) {
    res.status(400).json({ error: "agencyId is required" });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const status = typeof req.query.status === "string" && req.query.status ? req.query.status : null;
  const templateType = typeof req.query.templateType === "string" && req.query.templateType ? req.query.templateType : null;

  const filters = [
    eq(emailLogsTable.agencyId, agencyId),
    ...(status ? [eq(emailLogsTable.status, status)] : []),
    ...(templateType ? [eq(emailLogsTable.templateType, templateType)] : []),
  ];
  const where = filters.length === 1 ? filters[0] : and(...filters);

  const [logs, countRows] = await Promise.all([
    db.select().from(emailLogsTable).where(where).orderBy(desc(emailLogsTable.sentAt)).limit(limit).offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)::int` }).from(emailLogsTable).where(where),
  ]);

  res.json({ logs, total: countRows[0]?.count ?? 0, page, limit });
});

export default router;
