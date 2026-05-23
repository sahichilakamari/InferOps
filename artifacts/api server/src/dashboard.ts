import { Router } from "express";
import { db } from "@workspace/db";
import { incidents } from "@workspace/db";
import { simulator } from "../lib/simulator";

const router = Router();

router.get("/summaries", async (_req, res) => {
  try {
    const allIncidents = await db.select().from(incidents);
    const activeList = allIncidents.filter(i => i.status === "active");
    const summary = simulator.getDashboardSummary();
    const recentIncidents = allIncidents
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 5)
      .map(inc => ({
        id: inc.id,
        title: inc.title,
        description: inc.description,
        severity: inc.severity,
        status: inc.status,
        Services: inc.affectedServices ?? [],
        rootCause: inc.rootCause,
        startedAt: inc.startedAt.toISOString(),
        resolved: inc.resolvedAt?.toISOString() ?? null,
        err: inc.errorRate,
        CpuUsage: inc.peakCpuUsage,
      }));

    res.json({
      activeIncidents: activeList.length,
      recentIncidents,
      ...summary,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

export default router;
