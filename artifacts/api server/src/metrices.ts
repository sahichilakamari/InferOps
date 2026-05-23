import { Router } from "express";
import { simulator } from "../lib/simulator";

const router = Router();

// GET /metrics/current
router.get("/current", (_req, res) => {
  const snap = simulator.getCurrentMetrics();
  res.json({
    ...snap,
    globalCpu: snap.overall.cpuUsage,
    globalMemory: snap.overall.memoryUsage,
    Err: snap.overall.errorRate,
    totalRequestsPerSec: snap.overall.throughput,
  });
});

// GET /metrics/history
router.get("/history", (req, res) => {
  const minutes = req.query.minutes ? parseInt(req.query.minutes as string) : 30;
  const history = simulator.getMetricsHistory(minutes);
  res.json(history.map(snap => ({
    timestamps: snap.timestamp,
    services: null,
    cpuUsageService: snap.overall.cpuUsage,
    memoryUsage: snap.overall.memoryUsage,
    errorRate: snap.overall.errorRate,
    latencyMs: snap.overall.latencyMs,
    throughput: snap.overall.throughput,
  })));
});

export default router;
