import {
  agentSupportsPosCashSessionOpeningTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_CASH_SESSION_OPENING_TICKET_PAYLOAD_VERSION,
  type PosCashSessionOpeningTicketPayload,
  type PrintFormat,
} from "@kai/print-service-client";
import type { CashSessionOpeningPrintInput } from "@/features/cash-session-opening/lib/cash-session-opening-print.types";
import {
  buildCashSessionOpeningTicketHtml,
} from "@/features/cash-session-opening/lib/cash-session-opening-print";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

function openingPrintMeta(input: CashSessionOpeningPrintInput) {
  const ref = input.cashSessionId.trim().slice(0, 8).toUpperCase() || "apertura";
  return {
    filename: `apertura-caja-${ref}.escpos`,
    iframeTitle: "Apertura de caja",
    documentType: "CASH_SESSION_OPEN",
    internalFolio: ref,
  };
}

function openingToTicketPayload(
  input: CashSessionOpeningPrintInput,
  logoBase64: string | null,
): PosCashSessionOpeningTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_CASH_SESSION_OPENING_TICKET_PAYLOAD_VERSION,
    cashSessionId: input.cashSessionId,
    openedAt: input.openedAt,
    openingAmount: input.openingAmount,
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
    cashHubName: input.cashHubName?.trim() || null,
  };
}

export async function printCashSessionOpeningTicketVector(
  input: CashSessionOpeningPrintInput,
  format: PrintFormat = "ticket_80mm",
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = { ...openingPrintMeta(input), format };
  const origin = window.location.origin;
  const ticketHtml = buildCashSessionOpeningTicketHtml(input, origin, format);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, meta);
  }

  const ticket = openingToTicketPayload(input, null);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosCashSessionOpeningTicket(hello)) {
        throw new Error("agent_no_pos_cash_session_opening_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosCashSessionOpeningTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosCashSessionOpeningTicket(
            ticket,
            { ...meta, sourceApp: "pwa-pos" },
            true,
          )) as { jobId?: string; queued?: boolean };
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
  } catch (e) {
    console.warn("[KaiStore print] apertura de caja agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketBrowserFallback(ticketHtml, meta);
}
