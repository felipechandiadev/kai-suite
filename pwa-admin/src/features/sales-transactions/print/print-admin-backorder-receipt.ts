import { isDocumentPrintFormat } from "@flowstore/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { printSaleReceiptDocument } from "./backorder-document-print";
import { getAdminPrintFormatForData } from "./admin-print-format";
import { printAdminSaleTicket } from "./admin-backorder-ticket-print";

/**
 * Imprime un encargo según Impresión local del admin (ticket o documento en hoja).
 */
export async function printAdminBackorderReceipt(
  data: SaleReceiptPrintData,
): Promise<void> {
  const format = getAdminPrintFormatForData(data);
  if (isDocumentPrintFormat(format)) {
    await printSaleReceiptDocument(data, format);
    return;
  }
  const channel = await printAdminSaleTicket(data, { format });
  if (channel === "browser") {
    console.info("[KaiStore admin print] ticket impreso vía navegador.");
  }
}
