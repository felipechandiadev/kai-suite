"use server";

import { revalidatePath } from "next/cache";
import { CompaniesMercadoPagoRequest } from "../infrastructure/companies-mercado-pago.request";

export async function getCompanyMercadoPagoSettingsAction(companyId: string) {
  return CompaniesMercadoPagoRequest.getSettings(companyId);
}

export async function replaceCompanyMercadoPagoSettingsAction(
  companyId: string,
  mercadoPagoSettings: Record<string, unknown>,
) {
  const res = await CompaniesMercadoPagoRequest.replaceSettings(
    companyId,
    mercadoPagoSettings,
  );
  if (res.success) {
    revalidatePath("/settings/integrations");
    revalidatePath("/e-shop/integrations");
  }
  return res;
}
