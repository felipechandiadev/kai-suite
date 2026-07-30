"use server";

import { PurchasingDetailRequest } from "../infrastructure/purchasing-detail.request";
import type { PurchasingTransactionDetailResult } from "../types/purchasing-detail.types";

export async function getPurchasingTransactionDetailAction(
  transactionId: string,
): Promise<PurchasingTransactionDetailResult> {
  return PurchasingDetailRequest.getTransactionById(transactionId);
}
