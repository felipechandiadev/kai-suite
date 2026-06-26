"use server";

import { revalidatePath } from "next/cache";
import { EShopMercadoPagoRequest } from "../infrastructure/eshop-mercado-pago.request";

export async function getEShopMercadoPagoSettingsAction() {
  return EShopMercadoPagoRequest.getSettings();
}

export async function updateEShopMercadoPagoSettingsAction(body: {
  eshopOnlinePaymentEnabled?: boolean;
  eshopDefaultPaymentMode?: "online" | "coordinate";
}) {
  const res = await EShopMercadoPagoRequest.updateSettings(body);
  if (res.success) revalidatePath("/e-shop/integrations");
  return res;
}
