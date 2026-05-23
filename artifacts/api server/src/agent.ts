import OpenAI from "openai";
import { simulator } from "./simulator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RCAResult {
  rootCause: string;
  confidence: number;
  severity: string;
  affectedServices: string[];
  remediation: string[];
  explanation: string;
}

export async function analyzeIncident(
  incidentTitle: string,
  incidentDescription: string | null,
  affectedServices: string[],
  timelineEvents: { timestamp: string; message: string; eventType: string; service?: string | null }[]
): Promise<RCAResult> {
  const metrics = simulator.getCurrentMetrics();
  const logsContext = timelineEvents
    .slice(-20)
    .map(e => `[${e.eventType.toUpperCase()}] ${e.timestamp}: ${e.message}`)
    .join("\n");

  const metricsContext = metrics.services
    .map(s => `${s.name}: CPU=${s.cpuUsage.toFixed(1)}% MEM=${s.memoryUsage.toFixed(1)}% ERR=${s.errorRate.toFixed(2)}% LAT=${s.latencyMs.toFixed(0)}ms`)
    .join("\n");

  const prompt = `You are an elite Site Reliability Engineer performing root cause analysis.

INCIDENT: ${incidentTitle}
${incidentDescription ? `DESCRIPTION: ${incidentDescription}` : ""}
AFFECTED SERVICES: ${affectedServices.join(", ")}

TIMELINE:
${logsContext || "No timeline events available."}

CURRENT METRICS:
${metricsContext}

Analyze this infrastructure incident and respond with a JSON object (no markdown, raw JSON only) with these exact fields:
{
  "rootCause": "concise technical root cause in 1-2 sentences",
  "confidence": 0.87,
  "severity": "critical|high|medium|low",
  "affectedServices": ["service1", "service2"],
  "remediation": ["step 1", "step 2", "step 3"],
  "explanation": "detailed technical explanation of what happened, why it cascaded, and what the impact was — 3-4 sentences"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as RCAResult;
  } catch {
    return {
      rootCause: "Analysis could not be completed — insufficient telemetry data.",
      confidence: 0.45,
      severity: "unknown",
      affectedServices,
      remediation: ["Review recent deployments", "Check service logs", "Monitor metrics"],
      explanation: text.slice(0, 400),
    };
  }
}

export async function generatePostmortemContent(
  incidentTitle: string,
  affectedServices: string[],
  timeline: { timestamp: string; message: string; eventType: string }[],
  rootCause: string | null
): Promise<{ summary: string; impact: string; timeline: string; resolution: string; prevention: string[]; markdownContent: string }> {
  const timelineText = timeline
    .map(e => `- ${new Date(e.timestamp).toLocaleTimeString()} — ${e.message}`)
    .join("\n");

  const prompt = `You are an SRE writing a professional postmortem report.

INCIDENT: ${incidentTitle}
AFFECTED SERVICES: ${affectedServices.join(", ")}
ROOT CAUSE: ${rootCause || "Under investigation"}
TIMELINE:
${timelineText || "No detailed timeline available."}

Write a postmortem report as a JSON object (raw JSON, no markdown wrapper):
{
  "summary": "2-3 sentence executive summary",
  "impact": "description of user/business impact",
  "timeline": "chronological narrative of events",
  "resolution": "how the incident was resolved",
  "prevention": ["prevention recommendation 1", "prevention recommendation 2", "prevention recommendation 3", "prevention recommendation 4"],
  "markdownContent": "full postmortem in markdown format with all sections"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: `${incidentTitle} caused service degradation affecting ${affectedServices.join(", ")}.`,
      impact: "Services were degraded or unavailable for affected users during the incident window.",
      timeline: timelineText,
      resolution: "Services were restored following investigation and remediation steps.",
      prevention: ["Improve monitoring coverage", "Add circuit breakers", "Conduct load testing", "Review deployment procedures"],
      markdownContent: `# Postmortem: ${incidentTitle}\n\n## Summary\n${incidentTitle}\n\n## Root Cause\n${rootCause || "TBD"}\n\n## Timeline\n${timelineText}`,
    };
  }
}

export async function chatWithInfrastructure(
  message: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const metrics = simulator.getDashboardSummary();
  const services = simulator.getServices();

  const systemPrompt = `You are InferOps — an AI-powered SRE assistant. You have real-time visibility into the infrastructure.

CURRENT INFRASTRUCTURE STATUS:
- Active Incidents: (check recent conversation context)
- Services: ${services.map(s => `${s.name} (${s.status}, CPU: ${s.cpuUsage.toFixed(0)}%, ERR: ${s.errorRate.toFixed(1)}%)`).join(", ")}
- Overall Error Rate: ${metrics.errorRate.toFixed(2)}%
- Avg Latency: ${metrics.avgLatencyMs.toFixed(0)}ms
- Throughput: ${metrics.throughput.toFixed(0)} req/s
- CPU: ${metrics.cpuUsage.toFixed(1)}%
- Memory: ${metrics.memoryUsage.toFixed(1)}%

Answer questions concisely and technically. Focus on SRE best practices. Be direct — no fluff. If asked about a specific incident or outage, provide detailed analysis based on the infrastructure state. Format code/commands in backticks.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages,
  });

  return response.choices[0]?.message?.content ?? "I could not generate a response. Please try again.";
}
