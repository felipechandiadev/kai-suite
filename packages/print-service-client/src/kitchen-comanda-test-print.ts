import {
  PrintServiceConnection,
  agentSupportsPosKitchenTicket,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  type HelloResponseData,
  type PrintAgentCatalogItem,
} from "./core";
import { withSharedPrintServiceConnection } from "./connection-manager";
import { buildKitchenComandaTestPayload } from "./kitchen-comanda-print";
import type { PosKitchenTicketPayload } from "./pos-kitchen-ticket";

function extractJobId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const jobId = (res as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && jobId.trim() ? jobId.trim() : null;
}

async function enqueueTicketOnConn(
  conn: PrintServiceConnection,
  hello: HelloResponseData | null,
  ticket: PosKitchenTicketPayload,
  printerDisplayLabel: string | null,
  sourceApp: string,
): Promise<void> {
  if (hello != null && !agentSupportsPosKitchenTicket(hello)) {
    throw new Error("El agente no soporta comandas de cocina. Actualizá Kai Printers.");
  }
  const attempts: Array<boolean> = printerDisplayLabel?.trim() ? [false] : [false, true];
  let lastError: unknown = null;
  for (const omitLabel of attempts) {
    try {
      const res = (await conn.enqueuePosKitchenTicket(
        ticket,
        {
          filename: "comanda-prueba.escpos",
          documentType: "KITCHEN_COMANDA",
          internalFolio: "TEST",
          sourceApp,
          purpose: "comandas",
          format: "ticket_80mm",
          printerDisplayLabel,
        },
        omitLabel,
      )) as { jobId?: string; queued?: boolean };
      if (res && res.queued === false && !res.jobId) {
        throw new Error("El agente rechazó la prueba de comanda.");
      }
      const jobId = extractJobId(res);
      if (jobId) {
        const delivery = await conn.waitForPrintJob(jobId, {
          timeoutMs: 60_000,
          awaitUntil: "spooled",
        });
        if (delivery.status === "failed") {
          throw new Error(delivery.error || "print_failed");
        }
      }
      return;
    } catch (e) {
      lastError = e;
      if (String(e).includes("unknown_printer_display_label")) continue;
      throw e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo imprimir la comanda de prueba");
}

async function withAgentConnection(
  agent: PrintAgentCatalogItem | null | undefined,
  sourceApp: string,
  fn: (
    conn: PrintServiceConnection,
    hello: HelloResponseData | null,
  ) => Promise<void>,
): Promise<void> {
  const host = agent?.lanHost?.trim();
  if (host) {
    const tls = printServicePageRequiresTls();
    const port = tls ? (agent?.wssPort ?? 14568) : (agent?.wsPort ?? 14567);
    const conn = new PrintServiceConnection({
      url: buildWebSocketUrl(host, port, tls),
      clientId: "kai-kitchen-comanda-test",
      appLabel: sourceApp,
      requiredPurposes: ["comandas"],
    });
    conn.connect();
    try {
      await conn.waitForOpen(15_000);
      try {
        await conn.waitForHello(10_000);
      } catch {
        /* hello opcional */
      }
      await fn(conn, conn.getHelloPayload());
    } finally {
      conn.disconnect({ ifConnecting: "abandon" });
    }
    return;
  }

  await withSharedPrintServiceConnection(
    "comandas",
    {
      clientId: "kai-kitchen-comanda-test",
      appLabel: sourceApp,
      requiredPurposes: ["comandas"],
    },
    fn,
  );
}

export type PrintKitchenComandaTestInput = {
  productionUnitName: string;
  agent?: PrintAgentCatalogItem | null;
  printerDisplayLabel?: string | null;
  companyName?: string | null;
  sourceApp?: string;
};

export async function printKitchenComandaTest(
  input: PrintKitchenComandaTestInput,
): Promise<void> {
  if (typeof window === "undefined") return;
  const ticket = buildKitchenComandaTestPayload({
    productionUnitName: input.productionUnitName,
    companyName: input.companyName,
  });
  const label = input.printerDisplayLabel?.trim() || null;
  const sourceApp = input.sourceApp?.trim() || "kai";
  await withAgentConnection(input.agent, sourceApp, async (conn, hello) => {
    await enqueueTicketOnConn(conn, hello, ticket, label, sourceApp);
  });
}
