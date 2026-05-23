export interface HealthStatus {
  status: string;
}

export type IncidentSeverity = typeof IncidentSeverity[keyof typeof IncidentSeverity];


export const IncidentSeverity = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
} as const;

export type IncidentStatus = typeof IncidentStatus[keyof typeof IncidentStatus];


export const IncidentStatus = {
  active: 'active',
  acknowledged: 'acknowledged',
  resolved: 'resolved',
} as const;

export type IncidentInputSeverity = typeof IncidentInputSeverity[keyof typeof IncidentInputSeverity];


export const IncidentInputSeverity = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
} as const;

export interface IncidentInput {
  title: string;
  description?: string;
  severity: IncidentInputSeverity;
  affectedServices?: string[];
}

export type IncidentUpdateStatus = typeof IncidentUpdateStatus[keyof typeof IncidentUpdateStatus];


export const IncidentUpdateStatus = {
  active: 'active',
  acknowledged: 'acknowledged',
  resolved: 'resolved',
} as const;

export interface IncidentUpdate {
  status?: IncidentUpdateStatus;
  rootCause?: string;
  resolvedAt?: string;
}

export type TimelineEventEventType = typeof TimelineEventEventType[keyof typeof TimelineEventEventType];


export const TimelineEventEventType = {
  deployment: 'deployment',
  spike: 'spike',
  failure: 'failure',
  recovery: 'recovery',
  alert: 'alert',
  detection: 'detection',
} as const;

export interface TimelineEvent {
  id: number;
  incidentId: number;
  timestamp: string;
  message: string;
  eventType: TimelineEventEventType;
  /** @nullable */
  service?: string | null;
  /** @nullable */
  metadata?: string | null;

export interface Postmortem {
  id: number;
  incidentId: number;
  summary: string;
  rootCause: string;
  impact: string;
  timeline: string;
  resolution: string;
  prevention: string[];
  /** @nullable */
  markdownContent?: string | null;
  createdAt: string;
}

export type ServiceStatus = typeof ServiceStatus[keyof typeof ServiceStatus];


export const ServiceStatus = {
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'down',
  unknown: 'unknown',
} as const;

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  type: string;
  /** @nullable */
  errorRate?: number | null;
  /** @nullable */
  latencyMs?: number | null;
  /** @nullable */
  cpuUsage?: number | null;
  /** @nullable */
  memoryUsage?: number | null;
  /** @nullable */
  requestsPerSec?: number | null;
  lastUpdated?: string;
}

export type TopologyNodeStatus = typeof TopologyNodeStatus[keyof typeof TopologyNodeStatus];


export const TopologyNodeStatus = {
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'down',
  unknown: 'unknown',
} as const;

export interface TopologyNode {
  id: string;
  name: string;
  type: string;
  status: TopologyNodeStatus;
  /** @nullable */
  x?: number | null;
  /** @nullable */
  y?: number | null;
}

export interface TopologyEdge {
  source: string;
  target: string;
  /** @nullable */
  latencyMs?: number | null;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface ServiceMetrics {
  id: string;
  name: string;
  status: string;
  cpuUsage?: number;
  memoryUsage?: number;
  errorRate?: number;
  latencyMs?: number;
  requestsPerSec?: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  services: ServiceMetrics[];
  overall: OverallMetrics;
  globalCpu: number;
  globalMemory: number;
  totalErrorRate: number;
  totalRequestsPerSec: number;
}

export interface MetricsDataPoint {
  timestamp: string;
  /** @nullable */
  service?: string | null;
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  latencyMs: number;
  throughput: number;
}

export type LogEntrySeverity = typeof LogEntrySeverity[keyof typeof LogEntrySeverity];


export const LogEntrySeverity = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

export interface ChatResponse {
  id: string;
  message: string;
  role: string;
  conversationId?: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  /** @nullable */
  title?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  activeIncidents: number;
  downServices: number;
  healthyServices: number;
  avgLatencyMs: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  throughput: number;
  recentIncidents: Incident[];
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  /** @nullable */
  incidentId?: number | null;
  steps: string[];
}


export type ListIncidentsStatus = typeof ListIncidentsStatus[keyof typeof ListIncidentsStatus];


export const ListIncidentsStatus = {
  active: 'active',
  resolved: 'resolved',
  all: 'all',
} as const;

export type GetLogsParams = {
limit?: number;
severity?: string;
service?: string;
};

