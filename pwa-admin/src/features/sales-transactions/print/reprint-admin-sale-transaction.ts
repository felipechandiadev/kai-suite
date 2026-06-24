import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { SaleTransactionDetail } from "../types/sale-transaction-detail.types";
import { getAdminPrintFormatForTransactionType } from "./admin-print-format";
import { mapSaleTransactionDetailToPrintData } from "./map-sale-transaction-detail-to-print-data";
import {
  printAdminSaleDocumentExplicit,
  printAdminSaleTicketExplicit,
} from "./print-admin-sale-receipt";

const REPRINTABLE_TYPES = new Set(["SALE", "BACKORDER"]);

export function canAdminReprintSaleReceipt(transactionType: string): boolean {
  return REPRINTABLE_TYPES.has(String(transactionType ?? "").trim());
}

export async function reprintAdminSaleTicket(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (!canAdminReprintSaleReceipt(detail.transactionType)) {
    return { success: false, message: "Este tipo de transacción no admite ticket" };
  }
  const data = mapSaleTransactionDetailToPrintData(detail, company);
  const format = getAdminPrintFormatForTransactionType(detail.transactionType);
  const channel = await printAdminSaleTicketExplicit(data, { format });
  if (channel === "browser") {
    return {
      success: true,
      channel,
      message: "Ticket enviado al diálogo de impresión del navegador.",
    };
  }
  return { success: true, channel };
}

export async function reprintAdminSaleDocument(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (!canAdminReprintSaleReceipt(detail.transactionType)) {
    return { success: false, message: "Este tipo de transacción no admite documento" };
  }
  const data = mapSaleTransactionDetailToPrintData(detail, company);
  const format = getAdminPrintFormatForTransactionType(detail.transactionType);
  const channel = await printAdminSaleDocumentExplicit(data, { format });
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
