import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CompanyInternalCustomerCreditSettings,
  InternalCreditPaymentMethodRef,
} from "../types/company-internal-customer-credit.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

type ContextResponse = {
  success?: boolean;
  internalCustomerCredit?: CompanyInternalCustomerCreditSettings;
  internalCreditPaymentMethod?: InternalCreditPaymentMethodRef | null;
  message?: string;
};

export class CompaniesInternalCustomerCreditRequest {
  /** Empresa activa de la sesión (accesible para OPERATOR en POS). */
  static async getForActiveCompany(): Promise<
    | {
        success: true;
        internalCustomerCredit: CompanyInternalCustomerCreditSettings;
        internalCreditPaymentMethod: InternalCreditPaymentMethodRef | null;
      }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("company/internal-customer-credit-settings"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as ContextResponse;
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.internalCustomerCredit) {
        return { success: false, error: "Respuesta inválida del backend" };
      }
      return {
        success: true,
        internalCustomerCredit: data.internalCustomerCredit,
        internalCreditPaymentMethod: data.internalCreditPaymentMethod ?? null,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar crédito interno",
      };
    }
  }
}
