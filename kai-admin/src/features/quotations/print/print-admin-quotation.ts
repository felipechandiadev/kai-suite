import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { printAdminHtmlViaAgentOrBrowser } from "@/features/print/lib/admin-agent-document-print";
import type { QuotationDetail } from "../types/quotation.types";
import { printAdminQuotationTicket } from "./admin-quotation-ticket-print";
import {
  buildQuotationDocumentHtml,
  type QuotationPrintInput,
} from "./quotation-print-html";

export function toQuotationPrintInput(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): QuotationPrintInput {
  return { quotation, company };
}

export async function reprintAdminQuotationTicket(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  const res = await printAdminQuotationTicket(toQuotationPrintInput(quotation, company));
  if (!res.success) {
    return { success: false, message: res.message ?? "No se pudo imprimir el ticket" };
  }
  if (res.channel === "browser") {
    return {
      success: true,
      channel: "browser",
      message:
        "Ticket enviado al diálogo del navegador. Configure alias de tickets en Ajustes → Impresión local y verifique KaiPrinters.",
    };
  }
  return { success: true, channel: res.channel };
}

export async function reprintAdminQuotationDocument(
  quotation: QuotationDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }
  const html = buildQuotationDocumentHtml(toQuotationPrintInput(quotation, company));
  const folio = quotation.documentNumber?.trim() || "cotizacion";
  const channel = await printAdminHtmlViaAgentOrBrowser(html, {
    filename: `${folio}.pdf`,
    iframeTitle: "Impresión cotización documento",
    documentType: "QUOTATION",
    internalFolio: folio,
  });
  if (channel === "browser") {
    return {
      success: true,
      channel: "browser",
      message:
        "Documento enviado al diálogo del navegador. Configure alias de documentos en Ajustes → Impresión local y verifique KaiPrinters.",
    };
  }
  return { success: true, channel: "agent" };
}
