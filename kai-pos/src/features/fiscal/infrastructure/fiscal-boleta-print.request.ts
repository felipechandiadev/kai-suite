import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";

async function authHeaders(): Promise<HeadersInit | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) return null;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
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

export class FiscalBoletaPrintRequest {
  static async getPreviewByTransactionId(
    transactionId: string,
  ): Promise<
    | { success: true; preview: FiscalBoletaPrintPreview }
    | { success: false; message: string }
  > {
    const id = transactionId?.trim();
    if (!id) {
      return { success: false, message: "Transacción no especificada" };
    }
    const url = apiUrl(`transactions/${encodeURIComponent(id)}/fiscal-boleta-print-preview`);
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders();
    if (!headers) {
      return { success: false, message: "No autenticado" };
    }
    let res: Response;
    try {
      res = await fetch(url, { headers, cache: "no-store" });
    } catch {
      return {
        success: false,
        message: "No se pudo conectar con el servidor",
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      preview?: FiscalBoletaPrintPreview;
    };
    if (!res.ok || !json.success || !json.preview) {
      return {
        success: false,
        message: json.message?.trim() || "No hay boleta fiscal para esta venta",
      };
    }
    return { success: true, preview: json.preview };
  }
}
