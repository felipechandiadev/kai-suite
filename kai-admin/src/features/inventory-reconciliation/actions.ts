"use server";

import { revalidatePath } from "next/cache";
import { ReconciliationRequest } from "./infrastructure/reconciliation.request";

export async function retryStockFailuresAction() {
  const res = await ReconciliationRequest.retryStockFailures();
  revalidatePath("/inventory/reconciliation");
  return res;
}
