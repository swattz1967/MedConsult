import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reminderRulesTable } from "@workspace/db";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reminder-settings", async (req, res, next): Promise<void> => {
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
      ? Number(req.query.agencyId)
      : req.currentUser.agencyId;

    if (!agencyId || isNaN(agencyId)) {
      res.status(400).json({ error: "agencyId query parameter is required" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;

    const [rule] = await db
      .select()
      .from(reminderRulesTable)
      .where(eq(reminderRulesTable.agencyId, agencyId));
    if (!rule) {
      res.status(404).json({ error: "No reminder settings found for this agency" });
      return;
    }
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

router.put("/reminder-settings", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const { agencyId: bodyAgencyId, enabled, daysBeforeAppointment } = req.body as {
      agencyId: unknown;
      enabled: unknown;
      daysBeforeAppointment: unknown;
    };

    const agencyId = isAppOwner(req.currentUser)
      ? (typeof bodyAgencyId === "number" ? bodyAgencyId : null)
      : req.currentUser.agencyId;

    if (
      !agencyId ||
      typeof enabled !== "boolean" ||
      typeof daysBeforeAppointment !== "number" ||
      daysBeforeAppointment < 1 ||
      daysBeforeAppointment > 30
    ) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, agencyId, res)) return;

    req.log.info({ agencyId, enabled, daysBeforeAppointment }, "Updating reminder settings");

    const [existing] = await db
      .select()
      .from(reminderRulesTable)
      .where(eq(reminderRulesTable.agencyId, agencyId));

    if (existing) {
      const [updated] = await db
        .update(reminderRulesTable)
        .set({ enabled, daysBeforeAppointment })
        .where(eq(reminderRulesTable.agencyId, agencyId))
        .returning();
      req.log.info({ agencyId }, "Reminder settings updated");
      res.json(updated);
    } else {
      const [created] = await db
        .insert(reminderRulesTable)
        .values({ agencyId, enabled, daysBeforeAppointment })
        .returning();
      req.log.info({ agencyId }, "Reminder settings created");
      res.status(201).json(created);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
