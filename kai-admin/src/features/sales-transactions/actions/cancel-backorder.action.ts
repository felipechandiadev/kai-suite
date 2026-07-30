"use server";

import { revalidatePath } from "next/cache";
import { CancelBackorderRequest } from "../infrastructure/cancel-backorder.request";

export async function cancelBackorderAction(
  backorderId: string,
  reason?: string,
) {
  const res = await CancelBackorderRequest.cancel(backorderId, reason);
  if (res.success) {
    revalidatePath("/sales/transactions/backorders");
    revalidatePath("/sales/transactions");
  }
  return res;
}
