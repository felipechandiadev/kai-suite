import {
  PrintServiceConnection,
  buildWebSocketUrl,
  humanizePrintAgentError,
  printServicePageRequiresTls,
  readPosPurposePrinterAliasesFromStorage,
  writePosPurposePrinterAliasesToStorage,
  writePrintServiceConfigToStorage,
  type PosDocumentPrintMode,
} from "@kai/print-service-client";
import { printPosDocumentTest } from "@/features/pos-print/lib/print-pos-document-test";

export type PosQuickPrintTestResult = {
  channel: "agent" | "browser";
  detail: string;
};

export type PosQuickPrintTestConfig = {
  host: string;
  port: number;
  wssPort: number;
  useTls: boolean;
  ticketsAlias: string;
  saleMode: PosDocumentPrintMode;
};

function persistPrintPrefs(config: PosQuickPrintTestConfig): void {
  writePrintServiceConfigToStorage({
    host: config.host,
    port: config.port,
    wssPort: config.wssPort,
    useTls: config.useTls,
  });
  writePosPurposePrinterAliasesToStorage({
    ticketsAlias: config.ticketsAlias,
    documentsAlias: readPosPurposePrinterAliasesFromStorage().documentsAlias,
  });
}

function buildPrefsWsUrl(config: PosQuickPrintTestConfig): string {
  const tls = printServicePageRequiresTls() || config.useTls;
  const port = tls ? config.wssPort : config.port;
  return buildWebSocketUrl(config.host, port, tls);
}

/**
 * Envía un ticket de prueba al agente Kai Printers (mismo pipeline que la app Android).
 * Si falla la conexión o el agente, hace fallback al ticket de venta demo vía cola POS.
 */
export async function printPosQuickTicketTest(
  config: PosQuickPrintTestConfig,
): Promise<PosQuickPrintTestResult> {
  if (typeof window === "undefined") {
    return { channel: "browser", detail: "Solo disponible en el navegador." };
  }

  persistPrintPrefs(config);
  const url = buildPrefsWsUrl(config);
  const conn = new PrintServiceConnection({
    url,
    clientId: "pwa-pos-print-quick-test",
    appLabel: "KaiStore POS",
    userDisplayName: "Prueba impresión",
  });

  let reachedOpen = false;
  conn.connect();
  try {
    await conn.waitForOpen(20_000);
    reachedOpen = true;
    await conn.requestPosTestPrint("tickets");
    return {
      channel: "agent",
      detail: "Ticket de prueba enviado a Kai Printers. Espere 1–2 s antes de otra prueba (Bluetooth).",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[pos-print-quick-test] agente:", msg);
    try {
      const channel = await printPosDocumentTest("sale", config.saleMode);
      return {
        channel,
        detail:
          channel === "agent"
            ? "Ticket demo de venta encolado en el agente."
            : "El agente no respondió; se abrió el diálogo del navegador.",
      };
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(humanizePrintAgentError(msg) || fallbackMsg || "print_test_failed");
    }
  } finally {
    conn.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
  }
}
