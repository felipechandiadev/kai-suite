"use server";

import { revalidatePath } from "next/cache";
import { VoidSaleRequest } from "../infrastructure/void-sale.request";

export async function voidSaleAction(saleId: string, reason: string) {
  const res = await VoidSaleRequest.void(saleId, reason);
  if (res.success) {
    revalidatePath("/sales/transactions/sales");
    revalidatePath("/sales/transactions");
  }
  return res;
}
