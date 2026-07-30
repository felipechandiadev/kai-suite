import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CashSessionListRow,
  CashSessionListStatus,
  CashSessionsListResult,
} from "../types/cash-session-list.types";

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

export interface ListCashSessionsParams {
  pointOfSaleId?: string;
  status?: CashSessionListStatus;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function normalizeRow(raw: unknown): CashSessionListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const status = (o.status as CashSessionListStatus) ?? "OPEN";
  return {
    id,
    status,
    pointOfSaleName:
      typeof o.pointOfSaleName === "string" && o.pointOfSaleName.trim()
        ? o.pointOfSaleName.trim()
        : null,
    branchName:
      typeof o.branchName === "string" && o.branchName.trim()
        ? o.branchName.trim()
        : null,
    openedByFullName:
      typeof o.openedByFullName === "string" && o.openedByFullName.trim()
        ? o.openedByFullName.trim()
        : null,
    openedByUserName:
      typeof o.openedByUserName === "string" && o.openedByUserName.trim()
        ? o.openedByUserName.trim()
        : null,
    openedAt: toIsoString(o.openedAt),
    closedAt:
      typeof o.closedAt === "string" && o.closedAt.trim()
        ? o.closedAt.trim()
        : null,
    openingAmount: toNumber(o.openingAmount) ?? 0,
    closingAmount: toNumber(o.closingAmount),
    expectedAmount: toNumber(o.expectedAmount),
    salesTotal: toNumber(o.salesTotal) ?? 0,
    difference: toNumber(o.difference),
    createdAt: toIsoString(o.createdAt),
  };
}

export class CashSessionsListRequest {
  static async list(
    params: ListCashSessionsParams = {},
  ): Promise<
    | { success: true; data: CashSessionsListResult }
    | { success: false; error: string }
  > {
    try {
      const q = new URLSearchParams();
      if (params.pointOfSaleId) q.set("pointOfSaleId", params.pointOfSaleId);
      if (params.status) q.set("status", params.status);
      const qs = q.toString();
      const res = await fetch(apiUrl(`cash-sessions${qs ? `?${qs}` : ""}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        items?: unknown[];
        total?: number;
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
      const arr = Array.isArray(body?.items) ? body.items : [];
      const rows = arr
        .map(normalizeRow)
        .filter((x): x is CashSessionListRow => x != null);
      const total =
        typeof body?.total === "number" ? body.total : rows.length;
      return { success: true, data: { rows, total } };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar sesiones de caja",
      };
    }
  }
}
