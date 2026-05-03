import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const result = HealthCheckResponse.safeParse({ status: "ok" });
  if (!result.success) {
    res.status(500).json({ error: "Health check schema error" });
    return;
  }
  res.json(result.data);
});

export default router;
