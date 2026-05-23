import { Router } from "express";
import { db } from "@workspace/db";
import { incidents, timelineEvents, incidentAnalyses, postmortems } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { analyzeIncident, generatePostmortemReport } from "../lib/ai";
import { simulator } from "../lib/simulator";

const router = Router();

// GET /incidents
router.get("/", async (req, res) => {
  try {
    const { status, limits } = req.query;
    let query = db.select().from(incidents).orderBy(desc(incidents.startedAt));
    const rows = await query;
    let filtered = rows;
    if (status && status !== "all") {
      filtered = rows.filter(i => i.status === status);
    }
    const lim = limit ? parseInt(limit as string) : 50;
    const result = filtered.slice(0, lim).map(i => ({
      ...i,
      Services: JSON.parse(i.Services || "[]"),
      startedAt: i.startedAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list incidents");
    res.status(500).json({ error: "Failed to list incidents" });
  }
});

// POST /incidents
router.post("/", async (req, res) => {
  try {
    const { title, description, severity, affectedServices } = req.body;
    const [incident] = await db.insert(incidents).values({
      title,
      severity: severity || "medium",
      status: "active",
      affectedServices: JSON.stringify(affectedServices || []),
      startedAt: new Date(),
    }).returning();
    res.status(201).json({
      ...incident,
      affectedServices: JSON.parse(incident.affectedServices),
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create incident");
    res.status(500).json({ error: "Failed to create incident" });
  }
});

// POST /incidents/demo/trigger
router.post("/demo/trigger", async (req, res) => {
  try {
    // Create a demo incident
    const [incident] = await db.insert(incidents).values({
      title: "Redis Connection Pool Exhaustion — Cascading Auth Failure",
      description: "Deployment v1.4.2 triggered Redis connection pool exhaustion causing cascading authentication failures and full API outage.",
      severity: "critical",
      affectedServices: JSON.stringify(["Redis Cache", "Auth Service", "API Gateway", "Frontend"]),
      startedAt: new Date(),
      errorRate: 67.3,
      peakCpuUsage: 94.1,
    }).returning();

    const demoSteps = [
      { message: "Deployment v1.4.2 initiated on API Gateway", eventType: "deployment", service: "API Gateway", delay: 0 },
      { message: "CPU spike detected on Redis Cache (94%)", eventType: "spike", service: "Redis Cache", delay: 2000 },
      { message: "Redis connection pool saturation — 0 connections available", eventType: "failure", service: "Redis Cache", delay: 4000 },
      { message: "Auth Service token validation failing — Redis unreachable", eventType: "failure", service: "Auth Service", delay: 6000 },
      { message: "Cascading authentication failures — 42% error rate on Auth Service", eventType: "alert", service: "Auth Service", delay: 8000 },
      { message: "FULL OUTAGE CONFIRMED — Users cannot authenticate or access services", eventType: "alert", service: "API Gateway", delay: 12000 },
      { message: "AI root cause analysis initiated", eventType: "detection", service: "API Gateway", delay: 14000 },
      { message: "Root cause identified: Redis connection pool exhaustion from v1.4.2", eventType: "detection", service: "Redis Cache", delay: 16000 },
    ];

    // Insert timeline events
    const now = new Date();
    for (const step of demoSteps) {
      const ts = new Date(now.getTime() + step.delay);
      await db.insert(timelineEvents).values({
        incidentId: incident.id,
        message: step.message,
        eventType: step.eventType as any,
        service: step.service,
      });
    }

    // Trigger visual simulation in background
    simulator.triggerDemoScenario((step, log) => {
      req.log.info({ step }, "Demo scenario step");
    }).catch(() => {});

    res.json({
      id: "demo-001",
      name: "Redis Cascade Failure",
      description: "Pre-scripted demo: Deployment v1.4.2 → Redis saturation → Auth failure → Full outage",
      incidentId: incident.id,
      steps: demoSteps.map(s => s.message),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger demo");
    res.status(500).json({ error: "Failed to trigger demo" });
  }
});

// PATCH /incidents/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, rootCause, resolvedAt } = req.body;
    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (rootCause) updates.rootCause = rootCause;
    if (resolvedAt) updates.resolvedAt = new Date(resolvedAt);
    if (status === "resolved" && !resolvedAt) updates.resolvedAt = new Date();

    const [updated] = await db.update(incidents).set(updates).where(eq(incidents.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Incident not found" });

    if (status === "resolved") simulator.resetToHealthy();

    res.json({
      ...updated,
      affectedServices: JSON.parse(updated.affectedServices || "[]"),
      startedAt: updated.startedAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update incident");
    res.status(500).json({ error: "Failed to update incident" });
  }
});

// GET /incidents/:id/timeline
router.get("/:id/timeline", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const events = await db.select().from(timelineEvents).where(eq(timelineEvents.incidentId, id)).orderBy(timelineEvents.timestamp);
    res.json(events.map(e => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get timeline");
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

// GET /incidents/:id/analysis
router.get("/:id/analysis", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [analysis] = await db.select().from(incidentAnalyses).where(eq(incidentAnalyses.incidentId, id));
    if (!analysis) return res.status(404).json({ error: "No analysis found" });
    res.json({
      ...analysis,
      affectedServices: JSON.parse(analysis.affectedServices || "[]"),
      remediation: JSON.parse(analysis.remediation || "[]"),
      createdAt: analysis.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analysis");
    res.status(500).json({ error: "Failed to get analysis" });
  }
});

// POST /incidents/:id/analysis
router.post("/:id/analysis", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const events = await db.select().from(timelineEvents).where(eq(timelineEvents.incidentId, id)).orderBy(timelineEvents.timestamp);
    const affectedServices = JSON.parse(incident.affectedServices || "[]");

    const rca = await analyzeIncident(
      incident.title,
      incident.description,
      affectedServices,
      events.map(e => ({ timestamp: e.timestamp.toISOString(), message: e.message, eventType: e.eventType, service: e.service }))
    );

    // Delete existing analysis
    await db.delete(incidentAnalyses).where(eq(incidentAnalyses.incidentId, id));

    const [analysis] = await db.insert(incidentAnalyses).values({
      incidentId: id,
      rootCause: rca.rootCause,
      confidence: rca.confidence,
      severity: rca.severity,
      affectedServices: JSON.stringify(rca.affectedServices),
      remediation: JSON.stringify(rca.remediation),
      explanation: rca.explanation,
    }).returning();

    // Update incident root cause
    await db.update(incidents).set({ rootCause: rca.rootCause }).where(eq(incidents.id, id));

    res.status(202).json({
      ...analysis,
      affectedServices: rca.affectedServices,
      remediation: rca.remediation,
      createdAt: analysis.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger analysis");
    res.status(500).json({ error: "Failed to trigger analysis" });
  }
});

// GET /incidents/:id/postmortem
router.get("/:id/postmortem", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pm] = await db.select().from(postmortems).where(eq(postmortems.incidentId, id));
    if (!pm) return res.status(404).json({ error: "No postmortem found" });
    res.json({
      ...pm,
      prevention: JSON.parse(pm.prevention || "[]"),
      createdAt: pm.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get postmortem");
    res.status(500).json({ error: "Failed to get postmortem" });
  }
});

// POST /incidents/:id/replay
router.post("/:id/replay", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    simulator.triggerDemoScenario((step) => {}).catch(() => {});

    res.json({
      ...incident,
      affectedServices: JSON.parse(incident.affectedServices || "[]"),
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to start replay");
    res.status(500).json({ error: "Failed to start replay" });
  }
});

export default router;
