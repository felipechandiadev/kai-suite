import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CompanyEShopTopBarSettings,
  EShopTopBarAdminState,
} from "../types/eshop-topbar.types";

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

export class EShopTopBarRequest {
  static async get(companyId: string): Promise<EShopTopBarAdminState> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-topbar`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar la topbar eShop (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      topBar: CompanyEShopTopBarSettings;
      resolved: CompanyEShopTopBarSettings;
    };
    return { topBar: json.topBar, resolved: json.resolved };
  }

  static async patch(
    companyId: string,
    topBar: CompanyEShopTopBarSettings,
  ): Promise<{ topBar: CompanyEShopTopBarSettings; resolved: CompanyEShopTopBarSettings }> {
    const res = await fetch(apiUrl(`companies/${companyId}/eshop-topbar`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ topBar }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        typeof json?.message === "string" ? json.message : "No se pudo guardar la topbar",
      );
    }
    return {
      topBar: json.topBar as CompanyEShopTopBarSettings,
      resolved: json.resolved as CompanyEShopTopBarSettings,
    };
  }
}
