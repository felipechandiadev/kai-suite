import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CompanyEShopThemeSettings,
  EShopThemeAdminState,
  EShopResolvedTheme,
} from "../types/eshop-theme.types";

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

export class EShopThemeRequest {
  static async get(companyId: string): Promise<EShopThemeAdminState> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-theme`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el tema eShop (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      theme: CompanyEShopThemeSettings;
      resolved: EShopResolvedTheme;
      presets: EShopThemeAdminState["presets"];
    };
    return {
      theme: json.theme,
      resolved: json.resolved,
      presets: Array.isArray(json.presets) ? json.presets : [],
    };
  }

  static async patch(
    companyId: string,
    theme: CompanyEShopThemeSettings,
  ): Promise<{ theme: CompanyEShopThemeSettings; resolved: EShopResolvedTheme }> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-theme`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ theme }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        typeof json?.message === "string" ? json.message : "No se pudo guardar el tema",
      );
    }
    return {
      theme: json.theme as CompanyEShopThemeSettings,
      resolved: json.resolved as EShopResolvedTheme,
    };
  }
}
