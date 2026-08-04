import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosSaleReceiptPrintDto } from "../types/pos-sale-receipt-print.types";

async function authHeaders(companyIdOverride?: string | null): Promise<HeadersInit | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) return null;
  const sessionCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const activeCompanyId =
    (typeof companyIdOverride === "string" && companyIdOverride.trim()) ||
    sessionCompanyId ||
    null;
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

export class PosSaleReceiptPrintRequest {
  static async getByTransactionId(
    transactionId: string,
    options?: { scope?: "full" | "non_dte"; companyId?: string | null },
  ): Promise<
    | { success: true; receipt: PosSaleReceiptPrintDto }
    | { success: false; message: string }
  > {
    const id = transactionId?.trim();
    if (!id) {
      return { success: false, message: "Transacción no especificada" };
    }
    const scopeQuery =
      options?.scope === "non_dte" ? "?scope=non_dte" : "";
    const url = apiUrl(
      `transactions/${encodeURIComponent(id)}/pos-sale-receipt${scopeQuery}`,
    );
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders(options?.companyId);
    if (!headers) return { success: false, message: "No autenticado" };

    try {
      const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        receipt?: PosSaleReceiptPrintDto;
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
      if (!data?.receipt) {
        return { success: false, message: "Comprobante no disponible" };
      }
      return { success: true, receipt: data.receipt };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  }
}
