import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyEShopFlatSettings, CompanyIdentitySettings, CompanyPublicContactSettings } from "../types/company-eshop.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class CompaniesEShopRequest {
  static async getPublicContact(companyId: string) {
    const res = await fetch(apiUrl(`companies/${companyId}/public-contact-settings`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al cargar contacto" };
    return { success: true as const, publicContact: json.publicContact as CompanyPublicContactSettings };
  }

  static async replacePublicContact(companyId: string, publicContact: CompanyPublicContactSettings) {
    const res = await fetch(apiUrl(`companies/${companyId}/public-contact-settings`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ publicContact }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al guardar contacto" };
    return { success: true as const, publicContact: json.publicContact as CompanyPublicContactSettings };
  }

  static async getIdentity(companyId: string) {
    const res = await fetch(apiUrl(`companies/${companyId}/company-identity-settings`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al cargar identidad" };
    return { success: true as const, companyIdentity: json.companyIdentity as CompanyIdentitySettings };
  }

  static async replaceIdentity(companyId: string, companyIdentity: CompanyIdentitySettings) {
    const res = await fetch(apiUrl(`companies/${companyId}/company-identity-settings`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ companyIdentity }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al guardar identidad" };
    return { success: true as const, companyIdentity: json.companyIdentity as CompanyIdentitySettings };
  }

  static async getEShopSettings(companyId: string) {
    const res = await fetch(apiUrl(`companies/${companyId}/e-shop-settings`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al cargar eShop" };
    return { success: true as const, eShopSettings: json.eShopSettings as CompanyEShopFlatSettings };
  }

  static async replaceEShopSettings(companyId: string, eShopSettings: Partial<CompanyEShopFlatSettings>) {
    const res = await fetch(apiUrl(`companies/${companyId}/e-shop-settings`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ eShopSettings }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al guardar eShop" };
    return { success: true as const, eShopSettings: json.eShopSettings as CompanyEShopFlatSettings };
  }
}
