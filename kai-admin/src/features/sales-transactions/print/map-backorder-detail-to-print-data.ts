import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { SaleTransactionDetail } from "../types/sale-transaction-detail.types";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { mapSaleTransactionDetailToPrintData } from "./map-sale-transaction-detail-to-print-data";

/** @deprecated Usar `mapSaleTransactionDetailToPrintData`. */
export function mapBackorderDetailToPrintData(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): SaleReceiptPrintData {
  return mapSaleTransactionDetailToPrintData(detail, company);
}
