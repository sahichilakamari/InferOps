import { WebSocketServer, WebSocket } from "ws";
import { IncomeMessage, Server } from "http";
import { simulator } from "./simulator";
import { logger } from "./logger";

let wss: WebSocketServer | null = null;

function broadcast(data: unknown) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    logger.info("WebSocket client connected");

    // Send current state immediately
    const metrices = simulator.getCurrentMetrics();
    ws.send(JSON.stringify({ type: "metrics", payload: metrics }));

    ws.on("close", () => {
      logger.info("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  // Broadcast metrics every 3s
  simulator.on("metrics", (snapshots) => {
    broadcast({ type: "metrics", payload: snapshot });
  });

  // Broadcast logs as they stream
  simulator.on("log", (logs) => {
    broadcast({ type: "log", payload: log });
  });

  // Broadcast alerts
  simulator.on("alert", (alerts) => {
    broadcast({ type: "alert", payload: alert });
  });

  logger.info("WebSocket server initialized on /ws");
  return wss;
}
