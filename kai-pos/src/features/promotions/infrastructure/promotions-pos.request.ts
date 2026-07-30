import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EffectivePromotion } from "../types/promotion.types";

async function authHeaders(): Promise<HeadersInit | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) return null;
  const activeCompanyId = (
    session?.user as { activeCompanyId?: string | null }
  )?.activeCompanyId;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function apiUrl(path: string): string | null {
  const base = process.env.BACKEND_API_URL;
  if (!base) return null;
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export class PromotionsPosRequest {
  static async listEffective(input: {
    branchId: string;
    pointOfSaleId: string;
  }): Promise<
    | { success: true; promotions: EffectivePromotion[] }
    | { success: false; message: string }
  > {
    const url = apiUrl(
      `pos/me/promotions?branchId=${encodeURIComponent(input.branchId)}&pointOfSaleId=${encodeURIComponent(input.pointOfSaleId)}`,
    );
    const headers = await authHeaders();
    if (!url || !headers) return { success: false, message: "Sin sesión" };
    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data?.message || res.statusText };
      }
      return {
        success: true,
        promotions: Array.isArray(data?.promotions) ? data.promotions : [],
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error al listar promociones",
      };
    }
  }

  static async redeem(input: {
    code: string;
    branchId: string;
    pointOfSaleId: string;
  }): Promise<
    | { success: true; promotion: EffectivePromotion }
    | { success: false; message: string }
  > {
    const url = apiUrl("pos/me/promotions/redeem");
    const headers = await authHeaders();
    if (!url || !headers) return { success: false, message: "Sin sesión" };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data?.message || res.statusText };
      }
      if (data?.success && data?.promotion) {
        return { success: true, promotion: data.promotion };
      }
      return {
        success: false,
        message: data?.message || "Cupón inválido",
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error al canjear cupón",
      };
    }
  }
}
