import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq } from "drizzle-orm";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { db, consultationMediaTable, consultationRecordsTable, appointmentsTable, eventsTable, uploadTokensTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireUser, isAppOwner } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload. Requires a valid system user.
 */
router.post("/storage/uploads/request-url", requireUser, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectKey = objectStorageService.normalizeObjectEntityPath(uploadURL);

    // Record the issued token server-side so it can be claimed exactly once
    // by this user when they attach the file to a consultation.
    await db.insert(uploadTokensTable).values({
      objectKey,
      issuedByUserId: req.currentUser!.id,
      issuedByAgencyId: req.currentUser!.agencyId ?? null,
    });

    res.json(
      RequestUploadUrlResponse.parse({
        uploadUrl: uploadURL,
        objectKey,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR. Requires a valid system user
 * with access to the consultation that owns the requested object.
 */
router.get("/storage/objects/*path", requireUser, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Verify the requesting user has access to the consultation that owns this object.
    // App owners can access all objects; other users are restricted to their agency.
    if (!isAppOwner(req.currentUser!)) {
      const mediaRows = await db
        .select({ agencyId: eventsTable.agencyId })
        .from(consultationMediaTable)
        .innerJoin(consultationRecordsTable, eq(consultationMediaTable.consultationRecordId, consultationRecordsTable.id))
        .innerJoin(appointmentsTable, eq(consultationRecordsTable.appointmentId, appointmentsTable.id))
        .innerJoin(eventsTable, eq(appointmentsTable.eventId, eventsTable.id))
        .where(eq(consultationMediaTable.objectKey, objectPath));

      if (mediaRows.length === 0) {
        res.status(404).json({ error: "Object not found" });
        return;
      }

      const agencyId = mediaRows[0].agencyId;
      if (req.currentUser!.agencyId !== agencyId) {
        res.status(403).json({ error: "Forbidden: access to this object is not permitted" });
        return;
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
