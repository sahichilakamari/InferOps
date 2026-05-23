import { Router } from "express";
import { db } from "@workspace/db";
import { logEntries } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { simulator } from "../lib/simulator";

const router = Router();

// GET /logs
router.get("/", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const severity = req.query.severity as string | undefined;
  const service = req.query.service as string | undefined;

  res.json(filtered.slice(-limit).reverse());
});

export default router;
