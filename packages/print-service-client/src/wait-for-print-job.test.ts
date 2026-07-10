import { describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import { PrintServiceConnection } from "./core";

describe("PrintServiceConnection.waitForPrintJob", () => {
  it("resuelve en print_job_spooled cuando awaitUntil es spooled", async () => {
    let wss: WebSocketServer;
    const port = await new Promise<number>((resolve) => {
      wss = new WebSocketServer({ host: "127.0.0.1", port: 0 }, () => {
        const addr = wss.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });

    wss!.on("connection", (ws) => {
      globalThis.setTimeout(() => {
        ws.send(
          JSON.stringify({
            version: 1,
            event: "print_job_spooled",
            payload: { jobId: "job-1", purpose: "tickets" },
          }),
        );
      }, 30);
    });

    const conn = new PrintServiceConnection({
      url: `ws://127.0.0.1:${port}`,
      clientId: "test",
    });
    conn.connect();
    await conn.waitForOpen(3000);

    const result = await conn.waitForPrintJob("job-1", {
      timeoutMs: 3000,
      awaitUntil: "spooled",
    });
    expect(result.status).toBe("done");

    conn.disconnect({ ifConnecting: "abandon" });
    await new Promise<void>((r) => wss!.close(() => r()));
  });
});
