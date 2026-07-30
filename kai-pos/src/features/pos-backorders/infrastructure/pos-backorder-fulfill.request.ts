import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosBackorderForFulfill } from "../types/pos-backorder-for-fulfill.types";

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

export class PosBackorderFulfillRequest {
  static async findByDocumentNumber(
    documentNumber: string,
    pointOfSaleId?: string | null,
  ): Promise<
    | { success: true; backorder: PosBackorderForFulfill | null }
    | { success: false; message: string }
  > {
    const params = new URLSearchParams();
    if (pointOfSaleId?.trim()) params.set("pointOfSaleId", pointOfSaleId.trim());
    const qs = params.toString();
    const url = apiUrl(
      `transactions/backorders/by-document-number/${encodeURIComponent(documentNumber)}${qs ? `?${qs}` : ""}`,
    );
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders();
    if (!headers) return { success: false, message: "No autenticado" };

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        backorder?: PosBackorderForFulfill | null;
        message?: string | string[];
      };
      if (!res.ok) {
        const raw = data?.message;
        const msg = Array.isArray(raw)
          ? raw.join(", ")
          : typeof raw === "string"
            ? raw
            : `HTTP ${res.status}`;
        return { success: false, message: msg };
      }
      return { success: true, backorder: data.backorder ?? null };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  }
}
