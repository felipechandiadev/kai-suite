import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CashHubRow } from "../types/cash-hub.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function normalizeHub(raw: unknown): CashHubRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  if (!id || !companyId) return null;
  const bal =
    typeof o.currentBalance === "number" && Number.isFinite(o.currentBalance)
      ? o.currentBalance
      : o.currentBalance != null
        ? Number(o.currentBalance)
        : undefined;
  return {
    id,
    companyId,
    name: o.name != null ? String(o.name) : "",
    code: o.code != null ? String(o.code) : null,
    isActive: Boolean(o.isActive),
    currentBalance: bal != null && Number.isFinite(bal) ? bal : undefined,
    notes: o.notes != null ? String(o.notes) : null,
    branches: Array.isArray(o.branches) ? (o.branches as CashHubRow["branches"]) : [],
    pointsOfSale: Array.isArray(o.pointsOfSale) ? (o.pointsOfSale as CashHubRow["pointsOfSale"]) : [],
  };
}

export class CashHubsRequest {
  static async list(companyId: string): Promise<CashHubRow[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId: companyId.trim() });
    const res = await fetch(apiUrl(`cash-hubs?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const items = json?.items;
    if (!Array.isArray(items)) return [];
    return items.map(normalizeHub).filter((h): h is CashHubRow => h != null);
  }

  static async create(body: {
    companyId: string;
    name: string;
    notes?: string;
    isActive?: boolean;
    branchIds?: string[];
    pointOfSaleIds: string[];
  }): Promise<{ success: true; hub: CashHubRow } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("cash-hubs"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const err =
        typeof json?.error === "string"
          ? json.error
          : typeof json?.message === "string"
            ? json.message
            : `Error ${res.status}`;
      return { success: false, error: err };
    }
    const hub = normalizeHub(json?.hub);
    if (!hub) return { success: false, error: "Respuesta inválida del servidor" };
    return { success: true, hub };
  }

  static async update(
    id: string,
    companyId: string,
    body: {
      name?: string;
      notes?: string | null;
      isActive?: boolean;
      branchIds?: string[];
      pointOfSaleIds?: string[];
    },
  ): Promise<{ success: true; hub: CashHubRow } | { success: false; error: string }> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId: companyId.trim() });
    const res = await fetch(apiUrl(`cash-hubs/${encodeURIComponent(id)}?${q.toString()}`), {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const err =
        typeof json?.error === "string"
          ? json.error
          : typeof json?.message === "string"
            ? json.message
            : `Error ${res.status}`;
      return { success: false, error: err };
    }
    const hub = normalizeHub(json?.hub);
    if (!hub) return { success: false, error: "Respuesta inválida del servidor" };
    return { success: true, hub };
  }
}
