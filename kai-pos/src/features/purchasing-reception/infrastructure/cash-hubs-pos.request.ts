import { apiUrl, authHeaders } from "./api-auth";
import type { CashHubRow } from "../types/cash-hub.types";

function normalizeHub(raw: unknown): CashHubRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id).trim() : "";
  if (!id) return null;
  return {
    id,
    name: o.name != null ? String(o.name) : "",
    code: o.code != null ? String(o.code) : null,
    isActive: o.isActive !== false,
  };
}

export class CashHubsPosRequest {
  static async list(companyId: string): Promise<CashHubRow[]> {
    const id = companyId.trim();
    if (!id) return [];
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId: id });
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
}
