"use server";

import { PosSaleReceiptPrintRequest } from "../infrastructure/pos-sale-receipt-print.request";

export async function getPosSaleReceiptPrintAction(
  transactionId: string,
  options?: { scope?: "full" | "non_dte" },
) {
  return PosSaleReceiptPrintRequest.getByTransactionId(transactionId, options);
}
