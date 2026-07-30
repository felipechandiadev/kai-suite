"use server";

import { revalidatePath } from "next/cache";
import { CompaniesEShopRequest } from "../infrastructure/companies-eshop.request";
import type { CompanyEShopFlatSettings, CompanyIdentitySettings, CompanyPublicContactSettings } from "../types/company-eshop.types";

export async function getCompanyPublicContactAction(companyId: string) {
  return CompaniesEShopRequest.getPublicContact(companyId);
}

export async function replaceCompanyPublicContactAction(
  companyId: string,
  publicContact: CompanyPublicContactSettings,
) {
  const res = await CompaniesEShopRequest.replacePublicContact(companyId, publicContact);
  if (res.success) revalidatePath("/settings/company");
  return res;
}

export async function getCompanyIdentityAction(companyId: string) {
  return CompaniesEShopRequest.getIdentity(companyId);
}

export async function replaceCompanyIdentityAction(
  companyId: string,
  companyIdentity: CompanyIdentitySettings,
) {
  const res = await CompaniesEShopRequest.replaceIdentity(companyId, companyIdentity);
  if (res.success) revalidatePath("/settings/company");
  return res;
}

export async function getCompanyEShopSettingsAction(companyId: string) {
  return CompaniesEShopRequest.getEShopSettings(companyId);
}

export async function replaceCompanyEShopSettingsAction(
  companyId: string,
  eShopSettings: Partial<CompanyEShopFlatSettings>,
) {
  const res = await CompaniesEShopRequest.replaceEShopSettings(companyId, eShopSettings);
  if (res.success) {
    revalidatePath("/settings/company");
    revalidatePath("/e-shop");
  }
  return res;
}
