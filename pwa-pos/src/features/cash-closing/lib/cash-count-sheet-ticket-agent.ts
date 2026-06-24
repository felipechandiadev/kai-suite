import {
  agentSupportsPosCashCountSheetTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_CASH_COUNT_SHEET_TICKET_PAYLOAD_VERSION,
  type PosCashCountSheetTicketPayload,
  type PrintFormat,
} from "@flowstore/print-service-client";
import type { CashCountSheetPrintInput } from "@/features/cash-closing/lib/cash-count-sheet-print.types";
import { buildCashCountSheetDocumentHtml } from "@/features/cash-closing/lib/cash-count-sheet-print";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  enqueueVectorTicketAndAwaitDelivery,
  posTicketMetaToDocumentMeta,
  printPosTicketFailureDocumentFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

function countSheetPrintMeta(input: CashCountSheetPrintInput) {
  const ref = input.cashSessionId.trim().slice(0, 8).toUpperCase() || "conteo";
  return {
    filename: `planilla-conteo-${ref}.escpos`,
    iframeTitle: "Planilla de conteo",
    documentType: "CASH_COUNT_SHEET",
    internalFolio: ref,
  };
}

function cashCountSheetToTicketPayload(
  input: CashCountSheetPrintInput,
  logoBase64: string | null,
): PosCashCountSheetTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_CASH_COUNT_SHEET_TICKET_PAYLOAD_VERSION,
    cashSessionId: input.cashSessionId,
    sessionOpenedAt: input.sessionOpenedAt,
    printedAt: new Date().toISOString(),
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
    paymentLines: input.paymentLines.map((row) => ({
      label: row.label.trim() || "—",
    })),
  };
}

export async function printCashCountSheetTicketVector(
  input: CashCountSheetPrintInput,
  format: PrintFormat = "ticket_80mm",
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = { ...countSheetPrintMeta(input), format };
  const documentHtml = buildCashCountSheetDocumentHtml(input, format);
  const documentFallbackMeta = posTicketMetaToDocumentMeta(meta);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketFailureDocumentFallback(documentHtml, meta);
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    input.company?.logoUrl,
    window.location.origin,
  );
  const ticket = cashCountSheetToTicketPayload(input, logoBase64);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosCashCountSheetTicket(hello)) {
        throw new Error("agent_no_pos_cash_count_sheet_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosCashCountSheetTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosCashCountSheetTicket(
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
            html: documentHtml,
            iframeTitle: documentFallbackMeta.iframeTitle,
            kind: "document",
          },
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch (e) {
    console.warn("[KaiStore print] planilla de conteo agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketFailureDocumentFallback(documentHtml, meta);
}
