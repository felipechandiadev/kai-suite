"use server";

import { revalidatePath } from "next/cache";
import { EShopThemeRequest } from "../infrastructure/eshop-theme.request";
import type { CompanyEShopThemeSettings } from "../types/eshop-theme.types";

export async function getEShopThemeAction(companyId: string) {
  return EShopThemeRequest.get(companyId);
}

export async function saveEShopThemeAction(companyId: string, theme: CompanyEShopThemeSettings) {
  const result = await EShopThemeRequest.patch(companyId, theme);
  revalidatePath("/e-shop/appearance");
  revalidatePath("/e-shop");
  return { success: true as const, ...result };
}
