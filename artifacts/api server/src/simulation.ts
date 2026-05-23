import { EventEmitter } from "events";

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceState {
  id: string;
  name: string;
  type: string;
  status: ServiceStatus;
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  latencyMs: number;
  requestsPerSec: number;
  a: number;
  b: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  service: string;
  message: string;
}

export interface MetricsSnapshot {
  timestamp: string;
  services: ServiceState[];
  overall: {
    cpuUsage: number;
    memoryUsage: number;
    latencyMs: number;
    throughput: number;
  };
}

const SERVICES: ServiceState[] = [
  { id: "frontend", name: "Frontend", type: "web", status: "healthy", cpuUsage: 12, memoryUsage: 38, errorRate: 0.1, latencyMs: 45, requestsPerSec: 320, x: 400, y: 60 },
  { id: "api-gateway", name: "API Gateway", type: "gateway", status: "healthy", cpuUsage: 28, memoryUsage: 51, errorRate: 0.2, latencyMs: 62, requestsPerSec: 890, x: 400, y: 200 },
  { id: "auth-service", name: "Auth Service", type: "service", status: "healthy", cpuUsage: 22, memoryUsage: 44, errorRate: 0.1, latencyMs: 38, requestsPerSec: 410, x: 200, y: 340 },
  { id: "payment-service", name: "Payment Service", type: "service", status: "healthy", cpuUsage: 18, memoryUsage: 42, errorRate: 0.2, latencyMs: 110, requestsPerSec: 120, x: 600, y: 340 },
  { id: "redis", name: "Redis Cache", type: "cache", status: "healthy", cpuUsage: 9, memoryUsage: 66, errorRate: 0.0, latencyMs: 3, requestsPerSec: 2400, x: 200, y: 480 },
  { id: "postgres", name: "PostgreSQL", type: "database", status: "healthy", cpuUsage: 31, memoryUsage: 58, errorRate: 0.0, latencyMs: 18, requestsPerSec: 560, x: 600, y: 480 },
];

const LOG_MESSAGES: Record<string, string[]> = {
  INFO: [
    "Deployment v1.4.2 started on {service}",
    "Health check passed for {service}",
    "Cache warmed successfully on {service}",
    "Request processed in {latency}ms on {service}",
    "Scheduled job completed on {service}",
    "Connection pool size: {count} on {service}",
    "Configuration reloaded on {service}",
  ],
  WARN: [
    "CPU usage exceeded 85% on {service}",
    "Memory pressure detected on {service}",
    "Slow query detected ({latency}ms) on {service}",
    "Rate limit approaching threshold on {service}",
    "DB latency increased to {latency}ms on {service}",
    "Retry attempt {count} for {service}",
    "Connection pool near capacity on {service}",
  ],
  ERROR: [
    "Redis connection timeout on {service}",
    "Authentication service unavailable",
    "Database connection failed on {service}",
    "Request timeout after {latency}ms on {service}",
    "Circuit breaker opened for {service}",
    "Failed to process payment on {service}",
    "HTTP 502 Bad Gateway from {service}",
  ],
  CRITICAL: [
    "Cascading service failure detected across {service}",
    "Full outage confirmed - {service} unreachable",
    "Data consistency error on {service}",
    "Memory exhaustion imminent on {service}",
    "Emergency rollback triggered for {service}",
  ],
};

class InfraSimulator extends EventEmitter {
  private services: ServiceState[];
  private metricsHistory: MetricsSnapshot[] = [];
  private incidentMode = false;
  private demoStep = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private logIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.services = SERVICES.map(s => ({ ...s }));
    this.startSimulation();
  }

  private randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  private jitter(value: number, pct = 0.1) {
    const delta = value * pct;
    return Math.max(0, value + this.randomBetween(-delta, delta));
  }

  private generateLog(forcedSeverity?: "INFO" | "WARN" | "ERROR" | "CRITICAL"): LogEntry {
    const svc = this.pickRandom(this.services);
    let severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";

    if (forcedSeveritys) {
      severity = forcedSeverity;
    } else if (this.incidentMode) {
      const r = Math.random();
      severity = r < 0.05 ? "CRITICAL" : r < 0.25 ? "ERROR" : r < 0.5 ? "WARN" : "INFO";
    } else {
      const r = Math.random();
      severity = r < 0.01 ? "CRITICAL" : r < 0.08 ? "ERROR" : r < 0.2 ? "WARN" : "INFO";
    }

    const messages = LOG_MESSAGES[severity];
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity,
      service: svc.name,
      message: this.formatMessage(this.pickRandom(messages), svc),
    };
  }

  private updateMetrices() {
    if (!this.incidentMode) {
      for (const svc of this.services) {
        svc.cpuUsage = Math.min(95, Math.max(3, this.jitter(svc.cpuUsage, 0.08)));
        svc.memoryUsage = Math.min(95, Math.max(10, this.jitter(svc.memoryUsage, 0.04)));
        svc.errorRate = Math.max(0, this.jitter(svc.errorRate, 0.15));
        svc.latencyMs = Math.max(1, this.jitter(svc.latencyMs, 0.12));
        svc.requestsPerSec = Math.max(0, this.jitter(svc.requestsPerSec, 0.1));
        svc.status = svc.errorRate > 15 ? "down" : svc.errorRate > 5 ? "degraded" : "healthy";
      }
    }

    const snapshots: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      services: this.services.map(s => ({ ...s })),
      overall: {
        cpuUsage: this.services.reduce((a, s) => a + s.cpuUsage, 0) / this.services.length,
        memoryUsage: this.services.reduce((a, s) => a + s.memoryUsage, 0) / this.services.length,
        errorRate: this.services.reduce((a, s) => a + s.errorRate, 0) / this.services.length,
        latencyMs: this.services.reduce((a, s) => a + s.latencyMs, 0) / this.services.length,
        throughput: this.services.reduce((a, s) => a + s.requestsPerSec, 0),
      },
    };

    this.metricesHistory.push(snapshot);
    if (this.metricsHistory.length > 120) this.metricsHistory.shift();

    this.emit("metrics", snapshot);
    return snapshot;
  }

  private startingSimulation() {
    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, 3000);

    this.logIntervalId = setInterval(() => {
      const log = this.generateLog();
      this.emit("log", log);
    }, 1200);
  }

  getServices(): ServiceState[] {
    return this.services.map(s => ({ ...s }));
  }

  getTopology() {
    return {
      nodes: this.services.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        x: s.x,
        y: s.y,
      })),
      edges: [
        { source: "frontend", target: "api-gateway", latencyMs: 12 },
        { source: "api-gateway", target: "auth-service", latencyMs: 8 },
        { source: "api-gateway", target: "payment-service", latencyMs: 15 },
        { source: "auth-service", target: "redis", latencyMs: 3 },
        { source: "auth-service", target: "postgres", latencyMs: 18 },
        { source: "payment-service", target: "postgres", latencyMs: 18 },
      ],
    };
  }

  getCurrentMetrices(): MetricsSnapshot {
    return this.updateMetrics();
  }

  getMetricsHistory(minutes = 30): MetricsSnapshot[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metricsHistory.filter(m => new Date(m.timestamp) > cutoff);
  }

  getDashboardedSummary() {
    const services = this.services;
    const overall = {
      cpuUsage: services.reduce((a, s) => a + s.cpuUsage, 0) / services.length,
      memoryUsage: services.reduce((a, s) => a + s.memoryUsage, 0) / services.length,
      errorRate: services.reduce((a, s) => a + s.errorRate, 0) / services.length,
      latencyMs: services.reduce((a, s) => a + s.latencyMs, 0) / services.length,
      throughput: services.reduce((a, s) => a + s.requestsPerSec, 0),
    };
    return {
      downServices: services.filter(s => s.status === "down").length,
      healthyServices: services.filter(s => s.status === "healthy").length,
      avgLatencyMs: overall.latencyMs,
      errorRate: overall.errorRate,
      cpuUsage: overall.cpuUsage,
      memoryUsage: overall.memoryUsage,
      throughput: overall.throughput,
    };
  }

  async triggerDemoScenario(onStep: (step: string, log: LogEntry) => void): Promise<void> {
    this.incidentMode = true;
    const steps = [
      { delay: 0, msg: "Deployment v1.4.2 initiated", svc: "api-gateway", sev: "INFO" as const, action: () => {} },
      { delay: 2000, msg: "CPU spike detected on Redis Cache (94%)", svc: "redis", sev: "WARN" as const, action: () => { const r = this.services.find(s => s.id === "redis"); if (r) { r.cpuUsage = 94; r.latencyMs = 280; } } },
      { delay: 4000, msg: "Redis connection pool exhausted — saturation critical", svc: "redis", sev: "ERROR" as const, action: () => { const r = this.services.find(s => s.id === "redis"); if (r) { r.status = "degraded"; r.errorRate = 28; } } },
      { delay: 6000, msg: "Auth Service failing to reach Redis — token validation degraded", svc: "auth-service", sev: "ERROR" as const, action: () => { const a = this.services.find(s => s.id === "auth-service"); if (a) { a.status = "degraded"; a.errorRate = 42; a.latencyMs = 890; } } },
      { delay: 8000, msg: "Authentication failures cascading — API Gateway rejecting requests", svc: "api-gateway", sev: "CRITICAL" as const, action: () => { const g = this.services.find(s => s.id === "api-gateway"); if (g) { g.status = "degraded"; g.errorRate = 67; g.latencyMs = 2400; } } },
      { delay: 10000, msg: "Payment Service degraded — downstream DB latency spike", svc: "payment-service", sev: "ERROR" as const, action: () => { const p = this.services.find(s => s.id === "payment-service"); if (p) { p.status = "degraded"; p.errorRate = 35; } } },
      { delay: 12000, msg: "FULL OUTAGE CONFIRMED — Users cannot authenticate", svc: "frontend", sev: "CRITICAL" as const, action: () => { const r = this.services.find(s => s.id === "redis"); const a = this.services.find(s => s.id === "auth-service"); if (r) r.status = "down"; if (a) a.status = "down"; } },
      { delay: 14000, msg: "AI engine detecting incident pattern — initiating RCA", svc: "api-gateway", sev: "WARN" as const, action: () => {} },
      { delay: 16000, msg: "Root cause identified: Redis connection pool exhaustion from v1.4.2 deploy", svc: "api-gateway", sev: "INFO" as const, action: () => {} },
      { delay: 18000, msg: "Rollback recommended: git revert v1.4.2 and scale Redis replicas", svc: "api-gateway", sev: "INFO" as const, action: () => {} },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay === 0 ? 0 : 2000));
      step.action();
      const log: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        severity: step.sev,
        service: step.svc,
        message: step.msg,
      };
      this.emit("log", log);
      this.emit("alert", { severity: step.sev, service: step.svc, message: step.msg });
      onStep(step.msg, log);
      this.updateMetrics();
    }
  }

  resetToHealthyMode() {
    this.incidentMode = false;
    for (const svc of this.services) {
      const original = SERVICES.find(s => s.id === svc.id)!;
      Object.assign(svc, { ...original });
    }
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.logIntervalId) clearInterval(this.logIntervalId);
  }
}

export const simulator = new InfraSimulator();
