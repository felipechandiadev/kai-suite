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

export type CancelBackorderResult = {
  backorder: {
    id: string;
    documentNumber: string;
    reservationStatus: string;
  };
  creditNote: {
    id: string;
    documentNumber: string;
    total: number;
  } | null;
  refundedAmount: number;
};

export const CancelBackorderRequest = {
  async cancel(
    backorderId: string,
    reason?: string,
  ): Promise<
    | { success: true; data: CancelBackorderResult }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`transactions/backorders/${encodeURIComponent(backorderId)}/cancel`),
        {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ reason: reason?.trim() || undefined }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        backorder?: CancelBackorderResult["backorder"];
        creditNote?: CancelBackorderResult["creditNote"];
        refundedAmount?: number;
      };
      if (!res.ok || data.success === false) {
        return {
          success: false,
          error:
            typeof data.message === "string"
              ? data.message
              : res.statusText || "No se pudo anular el encargo",
        };
      }
      if (!data.backorder) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return {
        success: true,
        data: {
          backorder: data.backorder,
          creditNote: data.creditNote ?? null,
          refundedAmount: Math.round(Number(data.refundedAmount) || 0),
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al anular el encargo",
      };
    }
  },
};
