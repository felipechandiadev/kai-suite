"use client";

import {
  agentSupportsPosKitchenTicket,
  buildPosKitchenTicketPayload,
  buildWebSocketUrl,
  collectKitchenComandaPrintJobs,
  kitchenUnitShouldPrint,
  printServicePageRequiresTls,
  PrintServiceConnection,
  readWaiterKitchenComandaReplicaPrefs,
  replicaIncludesUnit,
  withSharedPrintServiceConnection,
  type HelloResponseData,
  type KitchenUnitPrintInfo,
  type PosKitchenTicketPayload,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";
import type {
  DiningOrderDto,
  WaiterLineProductMeta,
} from "../infrastructure/dining.request";

function extractJobId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const jobId = (res as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && jobId.trim() ? jobId.trim() : null;
}

async function enqueueTicketOnConn(
  conn: PrintServiceConnection,
  hello: HelloResponseData | null,
  ticket: PosKitchenTicketPayload,
  meta: {
    filename: string;
    documentType: string;
    internalFolio: string;
    sourceApp: string;
    purpose: "tickets";
    format: "ticket_80mm";
    printerDisplayLabel?: string | null;
  },
): Promise<void> {
  if (hello != null && !agentSupportsPosKitchenTicket(hello)) {
    throw new Error("agent_no_pos_kitchen_ticket");
  }
  const attempts: Array<boolean> = meta.printerDisplayLabel?.trim()
    ? [false]
    : [false, true];
  let lastError: unknown = null;
  for (const omitLabel of attempts) {
    try {
      const res = (await conn.enqueuePosKitchenTicket(
        ticket,
        meta,
        omitLabel,
      )) as { jobId?: string; queued?: boolean };
      if (res && res.queued === false && !res.jobId) {
        throw new Error("enqueue_rejected");
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
    : new Error("No se pudo imprimir la comanda");
}

async function withAgentConnection(
  agent: PrintAgentCatalogItem | null | undefined,
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
      clientId: "kai-waiter-kitchen-print",
      appLabel: "Kai Waiter",
      requiredPurposes: ["tickets"],
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
    "tickets",
    {
      clientId: "kai-waiter-kitchen-print",
      appLabel: "Kai Waiter",
      requiredPurposes: ["tickets"],
    },
    fn,
  );
}

export type PrintWaiterKitchenComandasInput = {
  order: DiningOrderDto;
  sentLineIds?: string[];
  productByVariantId: Record<string, WaiterLineProductMeta | undefined>;
  kitchenUnits: KitchenUnitPrintInfo[];
  printAgents?: PrintAgentCatalogItem[];
  companyName?: string | null;
};

export async function printWaiterKitchenComandasAfterFire(
  input: PrintWaiterKitchenComandasInput,
): Promise<void> {
  if (typeof window === "undefined") return;

  const lineNameFallback = new Map(
    (input.order.lines ?? []).map((l) => [
      l.id,
      l.productVariant?.name?.trim() || "",
    ]),
  );
  const jobs = collectKitchenComandaPrintJobs(
    input.order.lines ?? [],
    input.sentLineIds,
    (line) =>
      input.productByVariantId[line.productVariantId]?.name?.trim() ||
      lineNameFallback.get(line.id) ||
      "Producto",
  );
  if (jobs.length === 0) return;

  const unitById = new Map(input.kitchenUnits.map((u) => [u.id, u]));
  const agentById = new Map(
    (input.printAgents ?? []).map((a) => [a.id, a] as const),
  );
  const replicaPrefs = readWaiterKitchenComandaReplicaPrefs();
  const displayName = input.companyName?.trim() || "Empresa";
  const company = {
    razonSocial: displayName,
    nombreFantasia: displayName,
    rut: null as string | null,
    businessActivity: null as string | null,
    logoBase64: null as string | null,
  };

  for (const job of jobs) {
    const unit = unitById.get(job.productionUnitId);
    if (!unit) continue;

    const shouldPrintKitchen = kitchenUnitShouldPrint(unit.kitchenFulfillmentMode);
    const shouldReplica = replicaIncludesUnit(replicaPrefs, job.productionUnitId);
    if (!shouldPrintKitchen && !shouldReplica) continue;

    const baseTicket = buildPosKitchenTicketPayload({
      company,
      productionUnitName: unit.name,
      fireNumber: job.fireNumber,
      accountLabel: input.order.displayLabel,
      tableCode: input.order.diningTable?.code ?? null,
      lines: job.lines,
    });
    const folio = `F${job.fireNumber}-${job.productionUnitId.slice(0, 8)}`;
    const metaBase = {
      filename: `comanda-cocina-${folio}.escpos`,
      documentType: "KITCHEN_COMANDA",
      internalFolio: folio,
      sourceApp: "kai-waiter",
      purpose: "tickets" as const,
      format: "ticket_80mm" as const,
    };

    if (shouldPrintKitchen) {
      const agentId = unit.kitchenPrintSettings?.printAgentId?.trim() || null;
      const agent = agentId ? agentById.get(agentId) ?? null : null;
      const label =
        unit.kitchenPrintSettings?.printerDisplayLabel?.trim() || null;
      try {
        await withAgentConnection(agent, async (conn, hello) => {
          await enqueueTicketOnConn(conn, hello, baseTicket, {
            ...metaBase,
            printerDisplayLabel: label,
          });
        });
      } catch (e) {
        console.warn("[Kai Waiter print] comanda cocina UP:", e);
      }
    }

    if (shouldReplica) {
      const replicaTicket = { ...baseTicket, isReplica: true };
      try {
        await withSharedPrintServiceConnection(
          "tickets",
          {
            clientId: "kai-waiter-kitchen-print",
            appLabel: "Kai Waiter",
            requiredPurposes: ["tickets"],
          },
          async (conn, hello) => {
            await enqueueTicketOnConn(conn, hello, replicaTicket, {
              ...metaBase,
              filename: `comanda-replica-${folio}.escpos`,
            });
          },
        );
      } catch (e) {
        console.warn("[Kai Waiter print] réplica comanda:", e);
      }
    }
  }
}
