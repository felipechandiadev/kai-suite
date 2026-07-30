import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyQuotationSettings } from "../types/company-quotations.types";

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

export class CompaniesQuotationsRequest {
  static async get(
    companyId: string,
  ): Promise<
    | { success: true; quotationSettings: CompanyQuotationSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/quotation-settings`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotationSettings?: CompanyQuotationSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.quotationSettings) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin quotationSettings)",
        };
      }
      return { success: true, quotationSettings: data.quotationSettings };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar configuración de cotizaciones",
      };
    }
  }

  static async replace(
    companyId: string,
    quotationSettings: CompanyQuotationSettings,
  ): Promise<
    | { success: true; quotationSettings: CompanyQuotationSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/quotation-settings`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ quotationSettings }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotationSettings?: CompanyQuotationSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.quotationSettings) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin quotationSettings)",
        };
      }
      return { success: true, quotationSettings: data.quotationSettings };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar configuración de cotizaciones",
      };
    }
  }
}
