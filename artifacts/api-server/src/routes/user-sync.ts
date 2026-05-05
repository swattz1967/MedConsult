import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { SyncCurrentUserBody } from "@workspace/api-zod";
import { getClerkUserId } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/users/me/sync", async (req, res, next): Promise<void> => {
  const clerkId = getClerkUserId(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SyncCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, firstName, lastName } = parsed.data;

  try {
    req.log.info({ clerkId }, "Syncing user");
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ email, firstName: firstName ?? null, lastName: lastName ?? null })
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      res.json(updated);
      return;
    }
    const [newUser] = await db
      .insert(usersTable)
      .values({ clerkId, email, firstName: firstName ?? null, lastName: lastName ?? null, role: "customer" })
      .returning();
    res.json(newUser);
  } catch (err) {
    next(err);
  }
});

export default router;
