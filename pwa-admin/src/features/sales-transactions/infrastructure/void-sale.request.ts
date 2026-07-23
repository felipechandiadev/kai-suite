import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export type VoidSaleResult = {
  sale: {
    id: string;
    documentNumber: string;
    status: string;
  };
  voidAdjustmentId: string | null;
  stockAdjustmentId: string | null;
  voidedPaymentIds: string[];
};

export const VoidSaleRequest = {
  async void(
    saleId: string,
    reason: string,
  ): Promise<
    | { success: true; data: VoidSaleResult }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`transactions/sales/${encodeURIComponent(saleId)}/void`),
        {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ reason: reason.trim() }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string | string[];
        sale?: VoidSaleResult["sale"];
        voidAdjustmentId?: string | null;
        stockAdjustmentId?: string | null;
        voidedPaymentIds?: string[];
      };
      if (!res.ok || data.success === false) {
        const rawMessage = data.message;
        const error =
          typeof rawMessage === "string"
            ? rawMessage
            : Array.isArray(rawMessage)
              ? rawMessage.map(String).join(" ")
              : res.statusText || "No se pudo anular la venta";
        return {
          success: false,
          error,
        };
      }
      if (!data.sale) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return {
        success: true,
        data: {
          sale: data.sale,
          voidAdjustmentId: data.voidAdjustmentId ?? null,
          stockAdjustmentId: data.stockAdjustmentId ?? null,
          voidedPaymentIds: Array.isArray(data.voidedPaymentIds)
            ? data.voidedPaymentIds
            : [],
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al anular la venta",
      };
    }
  },
};
