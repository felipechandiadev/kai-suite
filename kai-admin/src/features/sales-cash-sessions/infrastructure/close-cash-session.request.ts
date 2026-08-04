import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CloseCashSessionResult } from "../types/close-cash-session.types";

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
  const activeCompanyId = session?.user?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function parseErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const raw = data?.message;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const parts = raw.map(String).map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  return fallback;
}

export class CloseCashSessionRequest {
  static async adminClose(input: {
    sessionId: string;
    notes?: string;
  }): Promise<CloseCashSessionResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id?.trim() || session?.user?.accessToken?.trim();
    if (!userId) {
      return { success: false, error: "No autenticado" };
    }

    const sessionId = input.sessionId?.trim();
    if (!sessionId) {
      return { success: false, error: "Sesión de caja no indicada" };
    }

    try {
      const headers = await authHeaders();
      const res = await fetch(apiUrl("cash-sessions/close"), {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify({
          sessionId,
          userId,
          adminClose: true,
          notes: input.notes?.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return {
          success: false,
          error: parseErrorMessage(data, res.statusText || "No se pudo cerrar la sesión"),
          statusCode: res.status,
        };
      }

      if (data?.success === false) {
        return {
          success: false,
          error: parseErrorMessage(data, "No se pudo cerrar la sesión"),
        };
      }

      return {
        success: true,
        message:
          typeof data?.message === "string" && data.message.trim()
            ? data.message.trim()
            : "Sesión cerrada correctamente",
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cerrar la sesión de caja",
      };
    }
  }
}
