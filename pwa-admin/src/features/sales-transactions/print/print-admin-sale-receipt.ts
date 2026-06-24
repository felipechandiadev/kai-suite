import type { PrintFormat } from "@flowstore/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { printSaleReceiptDocument } from "./backorder-document-print";
import { getAdminPrintFormatForData } from "./admin-print-format";
import { printAdminSaleTicket } from "./admin-backorder-ticket-print";

/** Ticket vía KaiPrinters ESC/POS o navegador. */
export async function printAdminSaleTicketExplicit(
  data: SaleReceiptPrintData,
  options?: { format?: PrintFormat },
): Promise<"agent" | "browser"> {
  return printAdminSaleTicket(data, options);
}

/** Documento en hoja vía KaiPrinters (PDF) o navegador. */
export async function printAdminSaleDocumentExplicit(
  data: SaleReceiptPrintData,
  options?: { format?: PrintFormat },
): Promise<"agent" | "browser"> {
  const format = options?.format ?? getAdminPrintFormatForData(data);
  return printSaleReceiptDocument(data, format);
}
