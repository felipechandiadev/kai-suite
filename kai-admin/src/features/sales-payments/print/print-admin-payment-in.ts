import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { printAdminHtmlViaAgentOrBrowser } from "@/features/print/lib/admin-agent-document-print";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import { printAdminPaymentInTicket } from "./admin-payment-in-ticket-print";
import { buildPaymentInDocumentHtml } from "./payment-in-document-print-html";
import { mapPaymentInDetailToPrintData } from "./map-payment-in-detail-to-print";

export function canAdminPrintPaymentIn(transactionType: string): boolean {
  return String(transactionType ?? "").trim() === "PAYMENT_IN";
}

export async function reprintAdminPaymentInTicket(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (!canAdminPrintPaymentIn(detail.transactionType)) {
    return { success: false, message: "Este documento no admite ticket de cobro" };
  }
  const data = mapPaymentInDetailToPrintData(detail, company);
  return printAdminPaymentInTicket(data);
}

export async function reprintAdminPaymentInDocument(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (!canAdminPrintPaymentIn(detail.transactionType)) {
    return { success: false, message: "Este documento no admite comprobante en hoja" };
  }
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }
  const data = mapPaymentInDetailToPrintData(detail, company);
  const html = buildPaymentInDocumentHtml(data);
  const folio = data.folio.trim() || "cobro";
  const channel = await printAdminHtmlViaAgentOrBrowser(html, {
    filename: `${folio}.pdf`,
    iframeTitle: "Impresión comprobante de cobro",
    documentType: "PAYMENT_IN",
    internalFolio: folio,
  });
  if (channel === "browser") {
    return {
      success: true,
      channel: "browser",
      message:
        "Documento enviado al diálogo del navegador. Configure alias de documentos en Ajustes → Impresión local.",
    };
  }
  return { success: true, channel: "agent" };
}
