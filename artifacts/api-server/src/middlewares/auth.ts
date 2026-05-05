import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

type ClerkAuth = { userId?: string };

export function getClerkUserId(req: Request): string | undefined {
  return (req as unknown as { auth?: ClerkAuth }).auth?.userId;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getClerkUserId(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clerkId = getClerkUserId(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      res.status(403).json({ error: "Forbidden: user not found in system" });
      return;
    }
    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}

export function isAppOwner(user: User): boolean {
  return user.role === "app_owner";
}

export function isAdminOrOwner(user: User): boolean {
  return user.role === "app_owner" || user.role === "admin";
}

export function assertAgencyAccess(user: User, agencyId: number, res: Response): boolean {
  if (isAppOwner(user)) return true;
  if (user.agencyId !== agencyId) {
    res.status(403).json({ error: "Forbidden: access to this agency is not permitted" });
    return false;
  }
  return true;
}
