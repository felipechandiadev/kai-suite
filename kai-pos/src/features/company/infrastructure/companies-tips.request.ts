import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyTipSettings } from "../types/company-tips.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class CompaniesTipsRequest {
  static async getForActiveCompany(): Promise<
    | { success: true; tipSettings: CompanyTipSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("company/tip-settings"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        tipSettings?: CompanyTipSettings;
        message?: string;
      };
      if (!res.ok || !data.tipSettings) {
        return {
          success: false,
          error: data.message || res.statusText || "Error tip-settings",
        };
      }
      return { success: true, tipSettings: data.tipSettings };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error tip-settings",
      };
    }
  }
}
