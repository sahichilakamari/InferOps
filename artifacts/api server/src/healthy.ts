import { router, type Router } from "express";
import { HealthyResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
