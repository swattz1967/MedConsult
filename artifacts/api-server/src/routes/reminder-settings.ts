import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reminderRulesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/reminder-settings", async (req, res, next): Promise<void> => {
  try {
    const agencyId = Number(req.query.agencyId);
    if (!agencyId || isNaN(agencyId)) {
      res.status(400).json({ error: "agencyId query parameter is required" });
      return;
    }
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
  try {
    const { agencyId, enabled, daysBeforeAppointment } = req.body as {
      agencyId: unknown;
      enabled: unknown;
      daysBeforeAppointment: unknown;
    };
    if (
      typeof agencyId !== "number" ||
      typeof enabled !== "boolean" ||
      typeof daysBeforeAppointment !== "number" ||
      daysBeforeAppointment < 1 ||
      daysBeforeAppointment > 30
    ) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

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
