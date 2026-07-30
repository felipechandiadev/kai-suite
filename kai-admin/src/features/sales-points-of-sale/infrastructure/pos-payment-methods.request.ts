import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  EffectivePaymentMethod,
  PosPaymentMethodConfig,
} from "../types/pos-payment-methods.types";

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

export class PosPaymentMethodsRequest {
  static async list(
    posId: string,
  ): Promise<
    | { success: true; paymentMethods: PosPaymentMethodConfig[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`points-of-sale/${encodeURIComponent(posId)}/payment-methods`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: PosPaymentMethodConfig[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as PosPaymentMethodConfig[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar medios de pago del POS",
      };
    }
  }

  static async replace(
    posId: string,
    paymentMethods: PosPaymentMethodConfig[],
  ): Promise<
    | { success: true; paymentMethods: PosPaymentMethodConfig[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`points-of-sale/${encodeURIComponent(posId)}/payment-methods`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ paymentMethods }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: PosPaymentMethodConfig[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as PosPaymentMethodConfig[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar medios de pago del POS",
      };
    }
  }

  static async getEffective(
    posId: string,
  ): Promise<
    | { success: true; paymentMethods: EffectivePaymentMethod[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `points-of-sale/${encodeURIComponent(posId)}/payment-methods/effective`,
        ),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: EffectivePaymentMethod[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as EffectivePaymentMethod[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar medios de pago efectivos del POS",
      };
    }
  }

  static async getEffectiveForMe(
    pointOfSaleId: string,
  ): Promise<
    | { success: true; paymentMethods: EffectivePaymentMethod[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `points-of-sale/me/payment-methods?pointOfSaleId=${encodeURIComponent(
            pointOfSaleId,
          )}`,
        ),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        paymentMethods?: EffectivePaymentMethod[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        paymentMethods: Array.isArray(data?.paymentMethods)
          ? (data.paymentMethods as EffectivePaymentMethod[])
          : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar medios de pago efectivos",
      };
    }
  }
}
