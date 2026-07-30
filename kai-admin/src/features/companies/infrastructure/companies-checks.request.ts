import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyCheckSettings } from "../types/company-checks.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class CompaniesChecksRequest {
  static async get(
    companyId: string,
  ): Promise<
    | { success: true; checkSettings: CompanyCheckSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/check-settings`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        checkSettings?: CompanyCheckSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.checkSettings) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin checkSettings)",
        };
      }
      return { success: true, checkSettings: data.checkSettings };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar configuración de cheques",
      };
    }
  }

  static async replace(
    companyId: string,
    checkSettings: CompanyCheckSettings,
  ): Promise<
    | { success: true; checkSettings: CompanyCheckSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/check-settings`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ checkSettings }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        checkSettings?: CompanyCheckSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.checkSettings) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin checkSettings)",
        };
      }
      return { success: true, checkSettings: data.checkSettings };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar configuración de cheques",
      };
    }
  }
}
