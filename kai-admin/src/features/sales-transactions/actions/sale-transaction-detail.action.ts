"use server";

import { SaleTransactionDetailRequest } from "../infrastructure/sale-transaction-detail.request";

export async function getSaleTransactionDetailAction(transactionId: string) {
  return SaleTransactionDetailRequest.getById(transactionId);
}
