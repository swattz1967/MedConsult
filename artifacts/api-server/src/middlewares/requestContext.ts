import type { Request, Response, NextFunction } from "express";

/**
 * Enriches every request's pino child-logger with:
 *  - userId   — Clerk user ID (authenticated routes only)
 *  - agencyId — extracted from query string or request body (best-effort)
 *  - source   — "public" for X-API-Key requests, "admin" for Clerk-authenticated ones
 *
 * Because pino-http already creates req.log as a child logger, calling
 * req.log.child() here re-binds it so all subsequent req.log calls in route
 * handlers automatically include these fields.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const clerkAuth = (req as unknown as { auth?: { userId?: string } }).auth;
  const userId    = clerkAuth?.userId ?? null;

  const rawAgencyId =
    (req.query.agencyId as string | undefined) ??
    (req.body?.agencyId as unknown as string | undefined);
  const agencyId = rawAgencyId ? Number(rawAgencyId) || null : null;

  const hasApiKey = typeof req.headers["x-api-key"] === "string";
  const source    = hasApiKey ? "public" : userId ? "admin" : "unauthenticated";

  const bindings: Record<string, unknown> = { source };
  if (userId)   bindings.userId   = userId;
  if (agencyId) bindings.agencyId = agencyId;

  req.log = req.log.child(bindings);

  next();
}
