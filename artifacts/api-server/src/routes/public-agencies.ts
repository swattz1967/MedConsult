import { Router, type IRouter } from "express";
import { db, agenciesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/agencies", async (_req, res, next): Promise<void> => {
  try {
    const agencies = await db.select().from(agenciesTable).orderBy(agenciesTable.name);
    res.json(
      agencies.map(({ apiKey: _a, webhookSecret: _w, ...safe }) => safe),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
