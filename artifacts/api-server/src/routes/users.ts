import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  ListUsersQueryParams,
} from "@workspace/api-zod";
import { isAppOwner, isAdminOrOwner } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/me", async (req, res, next): Promise<void> => {
  try {
    res.json(req.currentUser);
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const qp = ListUsersQueryParams.safeParse(req.query);
    const conditions = [];

    if (isAppOwner(req.currentUser)) {
      if (qp.success && qp.data.agencyId) conditions.push(eq(usersTable.agencyId, qp.data.agencyId));
      if (qp.success && qp.data.role) conditions.push(eq(usersTable.role, qp.data.role));
    } else {
      if (!req.currentUser.agencyId) {
        res.status(403).json({ error: "Forbidden: no agency associated with this account" });
        return;
      }
      conditions.push(eq(usersTable.agencyId, req.currentUser.agencyId));
      if (qp.success && qp.data.role) conditions.push(eq(usersTable.role, qp.data.role));
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
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
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
    if (!isAppOwner(req.currentUser) && user.agencyId !== req.currentUser.agencyId) {
      res.status(403).json({ error: "Forbidden: access to this user is not permitted" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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

  const isSelf = req.currentUser.id === params.data.id;
  const isOwner = isAppOwner(req.currentUser);

  if (!isSelf && !isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: you can only update your own account" });
    return;
  }

  const { role, agencyId, ...safeFields } = parsed.data;

  if (!isOwner && (role !== undefined || agencyId !== undefined)) {
    res.status(403).json({ error: "Forbidden: only app owners can change role or agency assignment" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const fieldsToUpdate = isOwner ? parsed.data : safeFields;
  for (const [key, value] of Object.entries(fieldsToUpdate)) {
    if (value !== null && value !== undefined) updateData[key] = value;
  }

  try {
    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!isOwner && targetUser.agencyId !== req.currentUser.agencyId) {
      res.status(403).json({ error: "Forbidden: access to this user is not permitted" });
      return;
    }

    req.log.info({ userId: params.data.id }, "Updating user");
    const [user] = await db
      .update(usersTable)
      .set(updateData)
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
