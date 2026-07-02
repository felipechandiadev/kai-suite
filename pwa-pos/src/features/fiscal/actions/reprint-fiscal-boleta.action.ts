"use server";

import { FiscalBoletaPrintRequest } from "../infrastructure/fiscal-boleta-print.request";

export async function getFiscalBoletaPrintPreviewAction(transactionId: string) {
  return FiscalBoletaPrintRequest.getPreviewByTransactionId(transactionId);
}
