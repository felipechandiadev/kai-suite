import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyDeferredPaymentSettings } from "../types/company-deferred-payment.types";

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

export class CompaniesDeferredPaymentRequest {
  static async get(
    companyId: string,
  ): Promise<
    | { success: true; deferredPayment: CompanyDeferredPaymentSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `companies/${encodeURIComponent(companyId)}/deferred-payment-settings`,
        ),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        deferredPayment?: CompanyDeferredPaymentSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.deferredPayment) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin deferredPayment)",
        };
      }
      return { success: true, deferredPayment: data.deferredPayment };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar configuración de venta sin pago",
      };
    }
  }

  static async replace(
    companyId: string,
    deferredPayment: CompanyDeferredPaymentSettings,
  ): Promise<
    | { success: true; deferredPayment: CompanyDeferredPaymentSettings }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `companies/${encodeURIComponent(companyId)}/deferred-payment-settings`,
        ),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ deferredPayment }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        deferredPayment?: CompanyDeferredPaymentSettings;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (!data?.deferredPayment) {
        return {
          success: false,
          error: "Respuesta inválida del backend (sin deferredPayment)",
        };
      }
      return { success: true, deferredPayment: data.deferredPayment };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar configuración de venta sin pago",
      };
    }
  }
}
