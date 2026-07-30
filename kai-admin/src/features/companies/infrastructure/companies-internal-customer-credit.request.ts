import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyInternalCustomerCreditSettings } from "../types/company-internal-customer-credit.types";

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

export class CompaniesInternalCustomerCreditRequest {
  static async get(
    companyId: string,
  ): Promise<
    | { success: true; internalCustomerCredit: CompanyInternalCustomerCreditSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `companies/${encodeURIComponent(companyId)}/internal-customer-credit-settings`,
        ),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        internalCustomerCredit?: CompanyInternalCustomerCreditSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.internalCustomerCredit) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin internalCustomerCredit)",
        };
      }
      return { success: true, internalCustomerCredit: data.internalCustomerCredit };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar configuración de crédito interno",
      };
    }
  }

  static async replace(
    companyId: string,
    internalCustomerCredit: CompanyInternalCustomerCreditSettings,
  ): Promise<
    | { success: true; internalCustomerCredit: CompanyInternalCustomerCreditSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `companies/${encodeURIComponent(companyId)}/internal-customer-credit-settings`,
        ),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ internalCustomerCredit }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        internalCustomerCredit?: CompanyInternalCustomerCreditSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.internalCustomerCredit) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin internalCustomerCredit)",
        };
      }
      return { success: true, internalCustomerCredit: data.internalCustomerCredit };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar configuración de crédito interno",
      };
    }
  }
}
