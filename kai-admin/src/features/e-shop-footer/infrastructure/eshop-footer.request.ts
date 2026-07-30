import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CompanyEShopFooterSettings,
  EShopFooterAdminState,
} from "../types/eshop-footer.types";

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

export class EShopFooterRequest {
  static async get(companyId: string): Promise<EShopFooterAdminState> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-footer`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el footer eShop (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      footer: CompanyEShopFooterSettings;
      resolved: CompanyEShopFooterSettings;
    };
    return { footer: json.footer, resolved: json.resolved };
  }

  static async patch(
    companyId: string,
    footer: CompanyEShopFooterSettings,
  ): Promise<{ footer: CompanyEShopFooterSettings; resolved: CompanyEShopFooterSettings }> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-footer`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ footer }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        typeof json?.message === "string" ? json.message : "No se pudo guardar el footer",
      );
    }
    return {
      footer: json.footer as CompanyEShopFooterSettings,
      resolved: json.resolved as CompanyEShopFooterSettings,
    };
  }
}
