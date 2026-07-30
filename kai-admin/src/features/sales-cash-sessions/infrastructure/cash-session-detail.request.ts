import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CashSessionMovementRow } from "../types/cash-session-movement.types";

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

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function normalizeMovement(raw: unknown): CashSessionMovementRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const direction = (o.direction as CashSessionMovementRow["direction"]) ?? "NEUTRAL";
  return {
    id,
    transactionType:
      typeof o.transactionType === "string" && o.transactionType.trim()
        ? o.transactionType.trim()
        : "",
    documentNumber:
      typeof o.documentNumber === "string" && o.documentNumber.trim()
        ? o.documentNumber.trim()
        : "—",
    createdAt: toIsoString(o.createdAt),
    total: Number(o.total) || 0,
    paymentMethod:
      typeof o.paymentMethod === "string" && o.paymentMethod.trim()
        ? o.paymentMethod.trim()
        : "—",
    userFullName:
      typeof o.userFullName === "string" && o.userFullName.trim()
        ? o.userFullName.trim()
        : null,
    userUserName:
      typeof o.userUserName === "string" && o.userUserName.trim()
        ? o.userUserName.trim()
        : null,
    direction: direction === "IN" || direction === "OUT" ? direction : "NEUTRAL",
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
    relatedTransactionId:
      typeof o.relatedTransactionId === "string" && o.relatedTransactionId.trim()
        ? o.relatedTransactionId.trim()
        : null,
  };
}

export class CashSessionDetailRequest {
  static async getById(
    cashSessionId: string,
  ): Promise<
    | { success: true; movements: CashSessionMovementRow[] }
    | { success: false; error: string }
  > {
    const id = cashSessionId?.trim();
    if (!id) {
      return { success: false, error: "Sesión inválida" };
    }
    try {
      const res = await fetch(apiUrl(`cash-sessions/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        movements?: unknown[];
        message?: string;
      };
      if (!res.ok || body?.success === false) {
        return {
          success: false,
          error:
            (typeof body?.message === "string" && body.message) ||
            res.statusText,
        };
      }
      const arr = Array.isArray(body?.movements) ? body.movements : [];
      const movements = arr
        .map(normalizeMovement)
        .filter((x): x is CashSessionMovementRow => x != null);
      return { success: true, movements };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar movimientos de sesión",
      };
    }
  }
}
