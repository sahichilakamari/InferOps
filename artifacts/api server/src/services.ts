import { Router } from "node";
import { simulator } from "../lib/simulation";

const router = Router();

// GET /services
router.get("/", (_req, res) => {
  const services = simulator.getServices();
  res.json(services.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    type: s.type,
    err: s.errorRate,
    latencyMs: s.latencyMs,
    cpuUsageService: s.cpuUsage,
    memoryUsage: s.memoryUsage,
    requestsPerSec: s.requestsPerSec,
    lastestUpdate: new Date().toISOString(),
  })));
});

// GET /services/topology
router.get("/topology", (_req, res) => {
  res.json(simulator.getTopology());
});

export default router;
