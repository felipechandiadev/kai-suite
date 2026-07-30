import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { PriceListListItem } from "../types/price-list.types";

function normalizeItem(row: unknown): PriceListListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null && String(o.id) ? String(o.id) : null;
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    priceListType: o.priceListType != null ? String(o.priceListType) : "RETAIL",
    currency: o.currency != null ? String(o.currency) : "CLP",
    priority: typeof o.priority === "number" ? o.priority : Number(o.priority) || 0,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    description: o.description != null && String(o.description) ? String(o.description) : null,
  };
}

export class PriceListRequest {
  static async findAll(): Promise<
    { success: true; priceLists: PriceListListItem[] } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("price-lists?includeInactive=true"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const json = data;
      const rows = Array.isArray(json) ? json : [];
      const priceLists = rows.map(normalizeItem).filter((x): x is PriceListListItem => x != null);
      return { success: true, priceLists };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar listas de precios",
      };
    }
  }
}
