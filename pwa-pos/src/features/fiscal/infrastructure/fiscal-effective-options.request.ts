import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { EffectiveDocumentOptionsResponse } from "../types/sale-dte.types";

export class FiscalEffectiveOptionsRequest {
  static async getForPos(pointOfSaleId: string): Promise<EffectiveDocumentOptionsResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    try {
      const res = await fetch(
        `${base}/api/points-of-sale/${encodeURIComponent(pointOfSaleId)}/fiscal/effective-options`,
        { method: "GET", headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || data.success !== true) {
        const msg =
          (typeof data.message === "string" && data.message) || `HTTP ${res.status}`;
        return { success: false, message: String(msg) };
      }
      return data as unknown as EffectiveDocumentOptionsResponse;
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error de red" };
    }
  }
}
