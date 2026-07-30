import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyMercadoPagoSettingsPublic } from "../types/company-mercado-pago.types";

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

export class EShopMercadoPagoRequest {
  static async getSettings() {
    const res = await fetch(apiUrl("/e-shop/admin/mercado-pago-settings"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al cargar integraciones eShop" };
    return {
      success: true as const,
      mercadoPagoSettings: json.mercadoPagoSettings as CompanyMercadoPagoSettingsPublic,
    };
  }

  static async updateSettings(body: {
    eshopOnlinePaymentEnabled?: boolean;
    eshopDefaultPaymentMode?: "online" | "coordinate";
  }) {
    const res = await fetch(apiUrl("/e-shop/admin/mercado-pago-settings"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al guardar integraciones eShop" };
    return {
      success: true as const,
      mercadoPagoSettings: json.mercadoPagoSettings as CompanyMercadoPagoSettingsPublic,
    };
  }
}
