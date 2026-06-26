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

export class CompaniesMercadoPagoRequest {
  static async getSettings(companyId: string) {
    const res = await fetch(apiUrl(`companies/${companyId}/mercado-pago-settings`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: "Error al cargar Mercado Pago" };
    return {
      success: true as const,
      mercadoPagoSettings: json.mercadoPagoSettings as CompanyMercadoPagoSettingsPublic,
    };
  }

  static async replaceSettings(
    companyId: string,
    mercadoPagoSettings: Record<string, unknown>,
  ) {
    const res = await fetch(apiUrl(`companies/${companyId}/mercado-pago-settings`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ mercadoPagoSettings }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg =
        typeof json?.message === "string"
          ? json.message
          : "Error al guardar Mercado Pago";
      return { success: false as const, error: msg };
    }
    return {
      success: true as const,
      mercadoPagoSettings: json.mercadoPagoSettings as CompanyMercadoPagoSettingsPublic,
    };
  }
}
