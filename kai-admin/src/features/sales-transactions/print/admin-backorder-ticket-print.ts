import {
  agentSupportsPosSaleTicket,
  isDocumentPrintFormat,
  type HelloResponseData,
  type PosSaleTicketPayload,
  type PosSaleTicketPrintExtras,
  type PrintFormat,
} from "@kai/print-service-client";
import type { PrintServiceConnection } from "@kai/print-service-client";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { buildSaleReceiptDocumentHtml } from "./backorder-document-print";
import { getAdminPrintFormatForData } from "./admin-print-format";
import { buildSaleReceiptTicketHtml } from "./sale-receipt-ticket-print-html";
import { mapSaleReceiptToPosSaleTicketPayload } from "./map-backorder-to-sale-ticket";

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

async function enqueueBackorderTicketOnAgent(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {
    type: "pos-sale-ticket",
    ticket,
    filename: meta.filename,
    copies: 1,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };
  if (omitDisplayLabel) {
    const res = (await conn.enqueuePrint({
      ...body,
      purpose: "tickets",
      sourceApp: "kai-admin",
    })) as { jobId?: string; queued?: boolean };
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
    return;
  }
  await enqueueAdminPrint(conn, "tickets", body);
}

/** Ticket térmico: agente ESC/POS o diálogo del navegador. */
export async function printAdminSaleTicket(
  data: SaleReceiptPrintData,
  options?: { format?: PrintFormat },
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const format = options?.format ?? getAdminPrintFormatForData(data);
  const origin = window.location.origin;
  const html = isDocumentPrintFormat(format)
    ? buildSaleReceiptDocumentHtml(data, format)
    : buildSaleReceiptTicketHtml(data, origin, format);
  const iframeTitle = isDocumentPrintFormat(format) ? "Impresión documento" : "Impresión ticket";

  if (!isAdminPrintAgentConfigured("tickets")) {
    printHtmlInHiddenIframe(html, iframeTitle);
    return "browser";
  }

  const folio = data.folio.trim() || "ticket";
  const meta: PosSaleTicketPrintExtras = {
    filename: `${folio}.escpos`,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
  };
  const ticket = mapSaleReceiptToPosSaleTicketPayload(data);
  let enqueued = false;

  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsPosSaleTicket(hello)) {
        throw new Error("agent_no_pos_sale_ticket");
      }
      try {
        await enqueueBackorderTicketOnAgent(conn, ticket, meta, false);
        enqueued = true;
      } catch (e) {
        if (!isUnknownPrinterLabelError(e)) throw e;
        await enqueueBackorderTicketOnAgent(conn, ticket, meta, true);
        enqueued = true;
      }
    });
  } catch (e) {
    console.warn("[KaiStore admin print] ticket agente:", e);
  }

  if (enqueued) return "agent";

  printHtmlInHiddenIframe(html, iframeTitle);
  return "browser";
}
