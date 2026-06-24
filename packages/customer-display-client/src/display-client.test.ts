import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { WebSocketServer } from "ws";
import { DisplayConnection } from "./display-client";
import { emptyIdleSnapshot } from "./display-snapshot";
import { DISPLAY_PROTOCOL_VERSION } from "./protocol";

// Node test environment: use ws as WebSocket implementation.
(globalThis as { WebSocket?: typeof WebSocket }).WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

describe("DisplayConnection debounce", () => {
  let wss: WebSocketServer;
  let port: number;
  let received: string[];

  beforeEach(async () => {
    received = [];
    wss = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => wss.on("listening", () => resolve()));
    const addr = wss.address();
    port = typeof addr === "object" && addr ? addr.port : 0;

    wss.on("connection", (socket) => {
      socket.on("message", (data) => {
        received.push(String(data));
        try {
          const msg = JSON.parse(String(data)) as { action?: string };
          if (msg.action === "hello") {
            socket.send(JSON.stringify({ ok: true, version: DISPLAY_PROTOCOL_VERSION }));
          } else {
            socket.send(JSON.stringify({ ok: true }));
          }
        } catch {
          // ignore
        }
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  it(
    "coalesces rapid snapshot publishes into one send",
    async () => {
      const client = new DisplayConnection({
        url: `ws://127.0.0.1:${port}`,
        pointOfSaleId: "pos-1",
        debounceMs: 80,
      });

      await new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 8000;
        client.connect();
        const poll = () => {
          if (client.isConnected()) {
            resolve();
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error("connect_timeout"));
            return;
          }
          setTimeout(poll, 30);
        };
        poll();
      });

      const snap1 = emptyIdleSnapshot({ pointOfSaleId: "pos-1" });
      const snap2 = { ...snap1, total: 500, state: "active_sale" as const };
      client.publishSnapshot(snap1);
      client.publishSnapshot(snap2);

      await new Promise((r) => setTimeout(r, 200));

      const cartMessages = received.filter((r) => r.includes("cart_snapshot"));
      expect(cartMessages.length).toBe(1);
      expect(cartMessages[0]).toContain('"total":500');

      client.disconnect();
    },
    15_000,
  );
});
