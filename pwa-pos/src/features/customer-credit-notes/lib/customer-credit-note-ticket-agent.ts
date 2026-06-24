import {
  agentSupportsPosCustomerCreditNoteTicket,
  getPosDocumentPrintFormat,
  isPosAgentPrintConfiguredForPurpose,
  POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION,
  type PosCustomerCreditNoteTicketPayload,
  type PrintFormat,
} from "@flowstore/print-service-client";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  enqueueVectorTicketAndAwaitDelivery,
  posTicketMetaToDocumentMeta,
  printPosTicketFailureDocumentFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import { buildCustomerCreditNoteDocumentHtml } from "@/features/customer-credit-notes/lib/customer-credit-note-document-print";

function creditNoteToTicketPayload(
  data: CustomerCreditNotePrintData,
  logoBase64: string | null,
): PosCustomerCreditNoteTicketPayload {
  const displayName =
    data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  return {
    version: POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION,
    creditNoteFolio: data.creditNoteFolio.trim(),
    saleReturnFolio: data.saleReturnFolio.trim(),
    originalSaleFolio: data.originalSaleFolio.trim(),
    issuedAtIso: data.issuedAtIso,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut?.trim() || null,
      businessActivity: data.company.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: data.pos.branchName?.trim() || null,
    pointOfSaleName: data.pos.pointOfSaleName?.trim() || null,
    customerName: data.customer?.name?.trim() || null,
    customerDocument: data.customer?.document?.trim() || null,
    lines: data.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitPriceWithTax: l.unitPriceWithTax,
      lineTotal: l.lineGross - l.discountAmount,
    })),
    totals: {
      subtotalNet: data.totals.subtotalNet,
      taxes: data.totals.taxes,
      discounts: data.totals.discounts,
      total: data.totals.total,
    },
    refundMode: data.refundMode,
    refundPayments: data.refundPayments,
  };
}

export async function printCustomerCreditNoteReceiptAgentOrBrowser(
  data: CustomerCreditNotePrintData,
  format?: PrintFormat,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const resolved = format ?? getPosDocumentPrintFormat("customerCreditNote");
  const folio = data.creditNoteFolio?.trim() || "nota-credito";
  const meta = {
    filename: `${folio}.escpos`,
    documentType: "CUSTOMER_CREDIT_NOTE",
    internalFolio: folio,
    iframeTitle: "Impresión nota de crédito",
    format: resolved,
  };
  const documentHtml = buildCustomerCreditNoteDocumentHtml(data, resolved);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: meta.iframeTitle,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };
  const documentFallbackMeta = posTicketMetaToDocumentMeta(ticketMeta);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketFailureDocumentFallback(documentHtml, ticketMeta);
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    data.company.logoUrl,
    window.location.origin,
  );
  const ticket = creditNoteToTicketPayload(data, logoBase64);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosCustomerCreditNoteTicket(hello)) {
        throw new Error("agent_no_pos_customer_credit_note_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosCustomerCreditNoteTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosCustomerCreditNoteTicket(
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
    console.warn("[KaiStore print] NC agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketFailureDocumentFallback(documentHtml, ticketMeta);
}

export function printCustomerCreditNoteReceiptAgentOrBrowserFireAndForget(
  data: CustomerCreditNotePrintData,
  format?: PrintFormat,
): void {
  void printCustomerCreditNoteReceiptAgentOrBrowser(data, format);
}
