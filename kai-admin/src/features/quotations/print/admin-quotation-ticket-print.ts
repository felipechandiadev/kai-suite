import {
  agentSupportsPosQuotationTicket,
  type HelloResponseData,
  type PosQuotationTicketPayload,
} from "@kai/print-service-client";
import type { PrintServiceConnection } from "@kai/print-service-client";
import { fetchReceiptLogoBase64 } from "@/features/print/lib/fetch-receipt-logo-base64";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import {
  buildQuotationReceiptHtml,
  type QuotationPrintInput,
} from "./quotation-print-html";

function quotationToTicketPayload(
  input: QuotationPrintInput,
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

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

async function enqueueQuotationTicket(
  conn: PrintServiceConnection,
  ticket: PosQuotationTicketPayload,
  meta: { filename: string; documentType: string; internalFolio: string },
  omitDisplayLabel: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {
    type: "pos-quotation-ticket",
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

export async function printAdminQuotationTicket(
  input: QuotationPrintInput,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }

  const folio = input.quotation.documentNumber?.trim() || "cotizacion";
  const meta = {
    filename: `${folio}.escpos`,
    documentType: "QUOTATION",
    internalFolio: folio,
  };
  const html = buildQuotationReceiptHtml(input, window.location.origin);

  if (!isAdminPrintAgentConfigured("tickets")) {
    printHtmlInHiddenIframe(html, "Impresión cotización");
    return { success: true, channel: "browser" };
  }

  const logoBase64 = await fetchReceiptLogoBase64(null, window.location.origin);
  const ticket = quotationToTicketPayload(input, logoBase64);
  let enqueued = false;

  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsPosQuotationTicket(hello)) {
        throw new Error("agent_no_pos_quotation_ticket");
      }
      try {
        await enqueueQuotationTicket(conn, ticket, meta, false);
        enqueued = true;
      } catch (e) {
        if (!isUnknownPrinterLabelError(e)) throw e;
        await enqueueQuotationTicket(conn, ticket, meta, true);
        enqueued = true;
      }
    });
  } catch (e) {
    console.warn("[KaiStore admin print] cotización agente:", e);
  }

  if (enqueued) return { success: true, channel: "agent" };

  printHtmlInHiddenIframe(html, "Impresión cotización");
  return { success: true, channel: "browser" };
}
