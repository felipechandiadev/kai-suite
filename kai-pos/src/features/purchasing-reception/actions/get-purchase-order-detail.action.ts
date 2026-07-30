"use server";

import { PurchaseOrderPosRequest } from "../infrastructure/purchase-order-pos.request";

export async function getPurchasingTransactionDetailPosAction(transactionId: string) {
  return PurchaseOrderPosRequest.getTransactionDetail(transactionId);
}
