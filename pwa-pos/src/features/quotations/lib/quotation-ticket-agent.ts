import {
  agentSupportsPosQuotationTicket,
  getPosDocumentPrintMode,
  isPosAgentPrintConfiguredForPurpose,
  posDocumentPrintModeToWireFormat,
  type PosQuotationTicketPayload,
  type PrintFormat,
} from "@kai/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import type { QuotationReceiptPrintInput } from "@/features/quotations/lib/quotation-receipt-print";
import { buildQuotationReceiptHtml } from "@/features/quotations/lib/quotation-receipt-print";

function quotationToTicketPayload(
  input: QuotationReceiptPrintInput,
  logoBase64: string | null,
): PosQuotationTicketPayload {
  const q = input.quotation;
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: 1,
    documentNumber: q.documentNumber?.trim() || q.id,
    issuedAt: q.issuedAt,
    validUntil: q.validUntil,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    customerName: q.customerName?.trim() || null,
    customerDocument: q.customerDocument?.trim() || null,
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    lines: (q.lines ?? []).map((l) => {
      const qty = Number(l.quantity) || 0;
      const unitWithTax = qty > 0 ? (Number(l.total) || 0) / qty : Number(l.unitPrice) || 0;
      return {
        productName: l.productName,
        variantName: l.variantName?.trim() || null,
        productSku: l.productSku?.trim() || null,
        quantity: l.quantity,
        unitPrice: unitWithTax,
        total: l.total,
      };
    }),
    subtotal: q.subtotal,
    taxAmount: q.taxAmount,
    discountAmount: q.discountAmount ?? 0,
    total: q.total,
    notes: q.notes?.trim() || null,
    terms: q.terms?.trim() || null,
  };
}

/** Cotización ticket 80 mm: agente ESC/POS o diálogo del navegador. */
export async function printPosQuotationReceiptAgentOrBrowser(
  input: QuotationReceiptPrintInput,
  format?: PrintFormat,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const resolved = format ?? posDocumentPrintModeToWireFormat(getPosDocumentPrintMode("quotation"));
  const folio = input.quotation.documentNumber?.trim() || "cotizacion";
  const meta = {
    filename: `${folio}.escpos`,
    documentType: "QUOTATION",
    internalFolio: folio,
    format: resolved,
  };
  const origin = window.location.origin;
  const ticketHtml = buildQuotationReceiptHtml(input, origin, resolved);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: "Impresión cotización",
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    input.company?.logoUrl,
    origin,
  );
  const ticket = quotationToTicketPayload(input, logoBase64);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosQuotationTicket(hello)) {
        throw new Error("agent_no_pos_quotation_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosQuotationTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosQuotationTicket(
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
            iframeTitle: ticketMeta.iframeTitle,
            kind: "ticket",
          },
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch (e) {
    console.warn("[KaiStore print] cotización agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
}

export function printPosQuotationReceiptAgentOrBrowserFireAndForget(
  input: QuotationReceiptPrintInput,
  format?: PrintFormat,
): void {
  void printPosQuotationReceiptAgentOrBrowser(input, format);
}
