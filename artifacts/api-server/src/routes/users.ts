import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  SyncCurrentUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  ListUsersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/me", async (req, res, next): Promise<void> => {
  const clerkAuth = (req as unknown as { auth?: { userId?: string } }).auth;
  const clerkId = clerkAuth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/users/me/sync", async (req, res, next): Promise<void> => {
  const parsed = SyncCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { clerkId, email, firstName, lastName } = parsed.data;
  try {
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

router.get("/users", async (req, res, next): Promise<void> => {
  try {
    const qp = ListUsersQueryParams.safeParse(req.query);
    const conditions = [];
    if (qp.success) {
      if (qp.data.agencyId) conditions.push(eq(usersTable.agencyId, qp.data.agencyId));
      if (qp.data.role) conditions.push(eq(usersTable.role, qp.data.role));
    }
    const users = conditions.length > 0
      ? await db.select().from(usersTable).where(and(...conditions))
      : await db.select().from(usersTable);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req, res, next): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", async (req, res, next): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  try {
    const [user] = await db
      .update(usersTable)
      .set(cleanData)
      .where(eq(usersTable.id, params.data.id))
      .returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
