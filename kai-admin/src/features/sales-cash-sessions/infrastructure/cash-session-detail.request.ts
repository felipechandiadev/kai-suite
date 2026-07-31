import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CashSessionDetail, CashSessionDetailResult } from "../types/cash-session-detail.types";
import type { CashSessionListStatus } from "../types/cash-session-list.types";
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

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function personFullName(person: unknown): string | null {
  if (!person || typeof person !== "object") return null;
  const p = person as Record<string, unknown>;
  const first = typeof p.firstName === "string" ? p.firstName.trim() : "";
  const last = typeof p.lastName === "string" ? p.lastName.trim() : "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function normalizeUserRef(raw: unknown): {
  fullName: string | null;
  userName: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { fullName: null, userName: null };
  }
  const o = raw as Record<string, unknown>;
  const userName =
    typeof o.userName === "string" && o.userName.trim()
      ? o.userName.trim()
      : null;
  return { fullName: personFullName(o.person), userName };
}

function normalizeMovement(raw: unknown): CashSessionMovementRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const direction =
    (o.direction as CashSessionMovementRow["direction"]) ?? "NEUTRAL";
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
      typeof o.relatedTransactionId === "string" &&
      o.relatedTransactionId.trim()
        ? o.relatedTransactionId.trim()
        : null,
  };
}

function normalizeSession(raw: unknown): CashSessionDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;

  const pos =
    o.pointOfSale && typeof o.pointOfSale === "object"
      ? (o.pointOfSale as Record<string, unknown>)
      : null;
  const branch =
    pos?.branch && typeof pos.branch === "object"
      ? (pos.branch as Record<string, unknown>)
      : null;

  const opened = normalizeUserRef(o.openedBy);
  const closed = normalizeUserRef(o.closedBy);
  const status = (o.status as CashSessionListStatus) ?? "OPEN";

  return {
    id,
    status,
    pointOfSaleId:
      o.pointOfSaleId != null
        ? String(o.pointOfSaleId)
        : pos?.id != null
          ? String(pos.id)
          : null,
    pointOfSaleName:
      typeof pos?.name === "string" && pos.name.trim()
        ? pos.name.trim()
        : typeof o.pointOfSaleName === "string" && o.pointOfSaleName.trim()
          ? o.pointOfSaleName.trim()
          : null,
    branchName:
      typeof branch?.name === "string" && branch.name.trim()
        ? branch.name.trim()
        : typeof o.branchName === "string" && o.branchName.trim()
          ? o.branchName.trim()
          : null,
    openedByFullName: opened.fullName,
    openedByUserName: opened.userName,
    closedByFullName: closed.fullName,
    closedByUserName: closed.userName,
    openedAt: toIsoString(o.openedAt),
    closedAt:
      typeof o.closedAt === "string" && o.closedAt.trim()
        ? o.closedAt.trim()
        : o.closedAt
          ? toIsoString(o.closedAt)
          : null,
    openingAmount: toNumber(o.openingAmount) ?? 0,
    closingAmount: toNumber(o.closingAmount),
    expectedAmount: toNumber(o.expectedAmount),
    difference: toNumber(o.difference),
    salesTotal: toNumber(o.salesTotal),
  };
}

export class CashSessionDetailRequest {
  static async getById(
    cashSessionId: string,
  ): Promise<
    | { success: true; data: CashSessionDetailResult }
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
        cashSession?: unknown;
        movements?: unknown[];
        message?: string;
      };
      if (!res.ok || body?.success === false) {
        return {
          success: false,
          error:
            (typeof body?.message === "string" && body.message) ||
            res.statusText ||
            "No se pudo cargar la sesión",
        };
      }
      const session = normalizeSession(body.cashSession);
      if (!session) {
        return { success: false, error: "Sesión de caja no encontrada" };
      }
      const arr = Array.isArray(body.movements) ? body.movements : [];
      const movements = arr
        .map(normalizeMovement)
        .filter((x): x is CashSessionMovementRow => x != null);

      if (session.salesTotal == null) {
        const salesSum = movements
          .filter((m) => m.transactionType === "SALE")
          .reduce((acc, m) => acc + m.total, 0);
        session.salesTotal = salesSum;
      }

      return { success: true, data: { session, movements } };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar detalle de sesión",
      };
    }
  }
}
