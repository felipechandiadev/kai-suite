"use client";

import {
  agentSupportsPosKitchenTicket,
  buildPosKitchenTicketPayload,
  buildWebSocketUrl,
  collectKitchenComandaPrintJobs,
  kitchenUnitShouldPrint,
  printServicePageRequiresTls,
  PrintServiceConnection,
  readPosKitchenComandaReplicaPrefs,
  replicaIncludesUnit,
  withSharedPrintServiceConnection,
  type HelloResponseData,
  type KitchenUnitPrintInfo,
  type PosKitchenTicketPayload,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { PosDiningOrderLine, PosDiningOrderSummary } from "@/features/dining/types/dining-pos.types";
import { listPrintAgentsForPosAction } from "@/features/print-agents/actions/print-agents.action";
import { listPosKitchenProductionUnitsAction } from "@/features/dining/actions/kitchen-production-units.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { isUnknownPrinterLabelError } from "@/features/pos-print/lib/pos-agent-print";

function extractJobId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const jobId = (res as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && jobId.trim() ? jobId.trim() : null;
}

function companyPayload(company: CompanyDetails | null) {
  const displayName =
    company?.nombreFantasia?.trim() ||
    company?.razonSocial?.trim() ||
    "Empresa";
  return {
    razonSocial: company?.razonSocial?.trim() || displayName,
    nombreFantasia: company?.nombreFantasia?.trim() || null,
    rut: company?.rut?.trim() || null,
    businessActivity: company?.businessActivity?.trim() || null,
    logoBase64: null as string | null,
  };
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
      if (isUnknownPrinterLabelError(e)) continue;
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
      clientId: "kai-pos-kitchen-print",
      appLabel: "KaiStore POS",
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
      clientId: "kai-pos-kitchen-print",
      appLabel: "KaiStore POS",
      requiredPurposes: ["tickets"],
    },
    fn,
  );
}

export type PrintKitchenComandasAfterFireInput = {
  order: PosDiningOrderSummary;
  sentLineIds?: string[];
  productNameByVariantId: Record<string, { name?: string } | undefined>;
  company: CompanyDetails | null;
  /** Opcional: UPs ya cargadas (evita fetch). */
  kitchenUnits?: KitchenUnitPrintInfo[];
  printAgents?: PrintAgentCatalogItem[];
};

/**
 * Tras sendToKitchen OK: imprime comanda en agente de UP (PRINTED|BOTH)
 * y réplica local si está habilitada. Errores: solo warn (no revierte el fire).
 */
export async function printKitchenComandasAfterFire(
  input: PrintKitchenComandasAfterFireInput,
): Promise<void> {
  if (typeof window === "undefined") return;

  const jobs = collectKitchenComandaPrintJobs(
    input.order.lines as PosDiningOrderLine[],
    input.sentLineIds,
    (line) =>
      input.productNameByVariantId[line.productVariantId]?.name?.trim() ||
      "Producto",
  );
  if (jobs.length === 0) return;

  let units = input.kitchenUnits;
  if (!units) {
    try {
      const rows = await listPosKitchenProductionUnitsAction({
        branchId: input.order.branchId,
      });
      units = rows.map((u) => ({
        id: u.id,
        name: u.name,
        kitchenFulfillmentMode: u.kitchenFulfillmentMode,
        kitchenPrintSettings: u.kitchenPrintSettings,
      }));
    } catch (e) {
      console.warn("[KaiFood print] list kitchen UPs:", e);
      return;
    }
  }
  const unitById = new Map(units.map((u) => [u.id, u]));

  let agents = input.printAgents;
  if (!agents) {
    try {
      const rows = await listPrintAgentsForPosAction();
      agents = rows.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        lanHost: a.lanHost,
        wsPort: a.wsPort,
        wssPort: a.wssPort,
        useTls: a.useTls,
        online: a.online,
        platform: a.platform,
      }));
    } catch {
      agents = [];
    }
  }
  const agentById = new Map(agents.map((a) => [a.id, a]));

  const replicaPrefs = readPosKitchenComandaReplicaPrefs();
  const posCtx = readPosContextClient();
  const company = companyPayload(input.company);

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
      tableCode: input.order.tableCode,
      branchName: posCtx?.branchName ?? null,
      lines: job.lines,
    });
    const folio = `F${job.fireNumber}-${job.productionUnitId.slice(0, 8)}`;
    const metaBase = {
      filename: `comanda-cocina-${folio}.escpos`,
      documentType: "KITCHEN_COMANDA",
      internalFolio: folio,
      sourceApp: "kai-pos",
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
        console.warn("[KaiFood print] comanda cocina UP:", e);
      }
    }

    if (shouldReplica) {
      const replicaTicket = { ...baseTicket, isReplica: true };
      try {
        await withSharedPrintServiceConnection(
          "tickets",
          {
            clientId: "kai-pos-kitchen-print",
            appLabel: "KaiStore POS",
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
        console.warn("[KaiFood print] réplica comanda:", e);
      }
    }
  }
}
