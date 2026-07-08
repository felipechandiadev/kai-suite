import { describe, expect, it } from "vitest";
import {
  buildPrintAgentTrustCertificateUrl,
  buildWebSocketUrl,
  httpsPageFromWebSocketUrl,
  isLoopbackPrintAgentHost,
  normalizePrintAgentHost,
  resolvePrintAgentConnectionUrls,
} from "./core";

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

describe("print agent trust certificate URL", () => {
  it("builds https URL from agent host and WSS port", () => {
    expect(buildPrintAgentTrustCertificateUrl("192.168.0.50", 14568)).toBe(
      "https://192.168.0.50:14568/",
    );
    expect(buildPrintAgentTrustCertificateUrl("localhost", "14570")).toBe(
      "https://127.0.0.1:14570/",
    );
  });

  it("derives https from wss URL", () => {
    expect(httpsPageFromWebSocketUrl("wss://192.168.1.5:14568")).toBe(
      "https://192.168.1.5:14568/",
    );
    expect(httpsPageFromWebSocketUrl("ws://127.0.0.1:14567")).toBeNull();
  });

  it("resolvePrintAgentConnectionUrls uses WSS when useTls", () => {
    const r = resolvePrintAgentConnectionUrls({
      host: "192.168.0.193",
      port: 14567,
      wssPort: 14568,
      useTls: true,
      pageRequiresTls: false,
    });
    expect(r.wsUrl).toBe("wss://192.168.0.193:14568");
    expect(r.usesTls).toBe(true);
    expect(r.trustCertificateUrl).toBe("https://192.168.0.193:14568/");
  });
});
