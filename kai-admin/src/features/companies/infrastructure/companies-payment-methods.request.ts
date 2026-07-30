import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyPaymentMethodConfig } from "../types/company-payment-methods.types";

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

export class CompaniesPaymentMethodsRequest {
  static async list(
    companyId: string,
  ): Promise<
    | { success: true; paymentMethods: CompanyPaymentMethodConfig[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/payment-methods`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: CompanyPaymentMethodConfig[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as CompanyPaymentMethodConfig[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar medios de pago",
      };
    }
  }

  static async replace(
    companyId: string,
    paymentMethods: CompanyPaymentMethodConfig[],
  ): Promise<
    | { success: true; paymentMethods: CompanyPaymentMethodConfig[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/payment-methods`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ paymentMethods }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: CompanyPaymentMethodConfig[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as CompanyPaymentMethodConfig[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar medios de pago",
      };
    }
  }
}
