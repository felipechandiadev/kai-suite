import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EffectivePaymentMethodsResponse } from "../types/effective-payment-method.types";

export class PaymentMethodsPosRequest {
  /** Trae la vista efectiva (merge company+POS) para pintar la pantalla de cobro. */
  static async getEffective(input: {
    pointOfSaleId: string;
  }): Promise<EffectivePaymentMethodsResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as
      | string
      | null
      | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const qs = new URLSearchParams({ pointOfSaleId: input.pointOfSaleId });

    try {
      const res = await fetch(
        `${base}/api/points-of-sale/me/payment-methods?${qs.toString()}`,
        { method: "GET", headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg) };
      }
      if (data?.success !== true) {
        return {
          success: false,
          message:
            (typeof data?.message === "string" && data.message) ||
            "Respuesta inválida del servidor",
        };
      }
      return data as unknown as EffectivePaymentMethodsResponse;
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
