import {
  agentSupportsPosCashHubMovementTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_CASH_HUB_MOVEMENT_TICKET_PAYLOAD_VERSION,
  type PosCashHubMovementTicketPayload,
  type PrintFormat,
} from "@kai/print-service-client";
import type { CashHubMovementPrintInput } from "@/features/cash-hub-movement/lib/cash-hub-movement-print.types";
import { buildCashHubMovementTicketHtml } from "@/features/cash-hub-movement/lib/cash-hub-movement-print";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

function movementPrintMeta(input: CashHubMovementPrintInput) {
  const stem = input.documentNumber.trim().replace(/[^\w.-]+/g, "-") || "movimiento";
  const dir = input.direction === "OUT" ? "egreso" : "ingreso";
  return {
    filename: `${dir}-efectivo-${stem}.escpos`,
    iframeTitle: input.direction === "OUT" ? "Egreso centro efectivo" : "Ingreso centro efectivo",
    documentType: input.direction === "OUT" ? "CASH_HUB_WITHDRAWAL" : "CASH_HUB_DEPOSIT",
    internalFolio: input.documentNumber.trim(),
  };
}

function movementToTicketPayload(
  input: CashHubMovementPrintInput,
  logoBase64: string | null,
): PosCashHubMovementTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_CASH_HUB_MOVEMENT_TICKET_PAYLOAD_VERSION,
    direction: input.direction,
    documentNumber: input.documentNumber.trim(),
    issuedAt: input.issuedAt,
    amount: input.amount,
    cashHubName: input.cashHubName.trim(),
    cashSessionId: input.cashSessionId.trim(),
    reason: input.reason?.trim() || null,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    operatorName: input.operatorName?.trim() || null,
  };
}

export async function printCashHubMovementTicketVector(
  input: CashHubMovementPrintInput,
  format: PrintFormat = "ticket_80mm",
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = { ...movementPrintMeta(input), format };
  const origin = window.location.origin;
  const ticketHtml = buildCashHubMovementTicketHtml(input, origin, format);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, meta);
  }

  const ticket = movementToTicketPayload(input, null);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosCashHubMovementTicket(hello)) {
        throw new Error("agent_no_pos_cash_hub_movement_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosCashHubMovementTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          }, false)) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosCashHubMovementTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          }, true)) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        {
          browserFallback: {
            html: ticketHtml,
            iframeTitle: meta.iframeTitle,
            kind: "ticket",
          },
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch {
    return printPosTicketBrowserFallback(ticketHtml, meta);
  }

  return enqueued ? "agent" : "browser";
}

export async function printCashHubMovementAwait(
  input: CashHubMovementPrintInput,
  format: PrintFormat = "ticket_80mm",
): Promise<"agent" | "browser"> {
  return printCashHubMovementTicketVector(input, format);
}

export function printCashHubMovement(input: CashHubMovementPrintInput): void {
  void printCashHubMovementAwait(input);
}
