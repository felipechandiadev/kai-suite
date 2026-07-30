"use server";

import { revalidatePath } from "next/cache";
import { EShopFooterRequest } from "../infrastructure/eshop-footer.request";
import type { CompanyEShopFooterSettings } from "../types/eshop-footer.types";

export async function getEShopFooterAction(companyId: string) {
  return EShopFooterRequest.get(companyId);
}

export async function saveEShopFooterAction(
  companyId: string,
  footer: CompanyEShopFooterSettings,
) {
  const result = await EShopFooterRequest.patch(companyId, footer);
  revalidatePath("/e-shop/footer");
  revalidatePath("/e-shop");
  return { success: true as const, ...result };
}
