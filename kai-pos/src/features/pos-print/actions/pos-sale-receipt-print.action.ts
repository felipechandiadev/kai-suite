"use server";

import { PosSaleReceiptPrintRequest } from "../infrastructure/pos-sale-receipt-print.request";

export async function getPosSaleReceiptPrintAction(
  transactionId: string,
  options?: { scope?: "full" | "non_dte"; companyId?: string | null },
) {
  return PosSaleReceiptPrintRequest.getByTransactionId(transactionId, options);
}
