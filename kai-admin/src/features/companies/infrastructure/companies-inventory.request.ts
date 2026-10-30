import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyInventorySettings } from "../types/company-inventory.types";

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

export class CompaniesInventoryRequest {
  static async get(companyId: string) {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(companyId)}/inventory-settings`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        inventorySettings?: CompanyInventorySettings;
        message?: string;
      };
      if (!res.ok) return { success: false as const, error: data?.message || res.statusText };
      if (!data.inventorySettings) {
        return { success: false as const, error: "Respuesta inválida del backend" };
      }
      return { success: true as const, inventorySettings: data.inventorySettings };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Error al cargar preventa",
      };
    }
  }

  static async replace(companyId: string, inventorySettings: CompanyInventorySettings) {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(companyId)}/inventory-settings`), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ inventorySettings }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        inventorySettings?: CompanyInventorySettings;
        message?: string;
      };
      if (!res.ok) return { success: false as const, error: data?.message || res.statusText };
      if (!data.inventorySettings) {
        return { success: false as const, error: "Respuesta inválida del backend" };
      }
      return { success: true as const, inventorySettings: data.inventorySettings };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Error al guardar preventa",
      };
    }
  }
}
