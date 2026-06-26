import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyPresaleSettings } from "../types/company-presales.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class CompaniesPresalesRequest {
  static async get(companyId: string) {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(companyId)}/presale-settings`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        presaleSettings?: CompanyPresaleSettings;
        message?: string;
      };
      if (!res.ok) return { success: false as const, error: data?.message || res.statusText };
      if (!data.presaleSettings) {
        return { success: false as const, error: "Respuesta inválida del backend" };
      }
      return { success: true as const, presaleSettings: data.presaleSettings };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Error al cargar preventa",
      };
    }
  }

  static async replace(companyId: string, presaleSettings: CompanyPresaleSettings) {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(companyId)}/presale-settings`), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ presaleSettings }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        presaleSettings?: CompanyPresaleSettings;
        message?: string;
      };
      if (!res.ok) return { success: false as const, error: data?.message || res.statusText };
      if (!data.presaleSettings) {
        return { success: false as const, error: "Respuesta inválida del backend" };
      }
      return { success: true as const, presaleSettings: data.presaleSettings };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Error al guardar preventa",
      };
    }
  }
}
