"use server";

import { revalidatePath } from "next/cache";
import { EShopTopBarRequest } from "../infrastructure/eshop-topbar.request";
import type { CompanyEShopTopBarSettings } from "../types/eshop-topbar.types";

export async function getEShopTopBarAction(companyId: string) {
  return EShopTopBarRequest.get(companyId);
}

export async function saveEShopTopBarAction(
  companyId: string,
  topBar: CompanyEShopTopBarSettings,
) {
  const result = await EShopTopBarRequest.patch(companyId, topBar);
  revalidatePath("/e-shop/topbar");
  revalidatePath("/e-shop");
  return { success: true as const, ...result };
}
