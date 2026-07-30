"use server";

import { PurchaseOrderPosRequest } from "../infrastructure/purchase-order-pos.request";

export async function searchPurchaseOrdersForReceptionPosAction(query: string) {
  return PurchaseOrderPosRequest.searchForReception(query);
}
