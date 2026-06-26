import { describe, expect, it } from "vitest";
import { buildWebSocketUrl, isLoopbackPrintAgentHost, normalizePrintAgentHost } from "./core";

describe("normalizePrintAgentHost", () => {
  it("maps localhost and IPv6 loopback names to 127.0.0.1", () => {
    expect(normalizePrintAgentHost("localhost")).toBe("127.0.0.1");
    expect(normalizePrintAgentHost("LOCALHOST")).toBe("127.0.0.1");
    expect(normalizePrintAgentHost("::1")).toBe("127.0.0.1");
    expect(normalizePrintAgentHost("[::1]")).toBe("127.0.0.1");
  });

  it("preserves LAN hosts", () => {
    expect(normalizePrintAgentHost("192.168.1.10")).toBe("192.168.1.10");
  });

  it("defaults empty to 127.0.0.1", () => {
    expect(normalizePrintAgentHost("")).toBe("127.0.0.1");
    expect(normalizePrintAgentHost("   ")).toBe("127.0.0.1");
  });

  it("detects loopback agent host", () => {
    expect(isLoopbackPrintAgentHost("127.0.0.1")).toBe(true);
    expect(isLoopbackPrintAgentHost("localhost")).toBe(true);
    expect(isLoopbackPrintAgentHost("192.168.0.193")).toBe(false);
  });
});

describe("buildWebSocketUrl", () => {
  it("builds ws and wss URLs", () => {
    expect(buildWebSocketUrl("127.0.0.1", 14567, false)).toBe("ws://127.0.0.1:14567");
    expect(buildWebSocketUrl("127.0.0.1", 14568, true)).toBe("wss://127.0.0.1:14568");
  });
});
