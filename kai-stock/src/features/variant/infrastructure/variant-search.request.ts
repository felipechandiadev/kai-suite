import { apiFailure } from "@/lib/auth/api-response";
import { authHeaders, apiUrl } from "@/lib/auth/auth-headers";
import type { VariantSearchItem, VariantSearchResult } from "../types/variant-search.types";

function normalizeItem(row: unknown): VariantSearchItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) {
    return null;
  }
  const avRaw = o.attributeValues;
  const attributeValues: Record<string, string> =
    avRaw != null && typeof avRaw === "object" && !Array.isArray(avRaw)
      ? Object.fromEntries(
          Object.entries(avRaw as Record<string, unknown>)
            .map(([k, v]) => [String(k), v == null ? "" : String(v)])
            .filter(([, v]) => v.trim() !== ""),
        )
      : {};
  return {
    id,
    productId: o.productId != null ? String(o.productId) : "",
    productName: o.productName != null ? String(o.productName) : "",
    categoryName:
      o.categoryName != null && String(o.categoryName).trim() ? String(o.categoryName).trim() : null,
    sku: o.sku != null ? String(o.sku) : "",
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode).trim() : null,
    pmp:
      typeof o.pmp === "number" && Number.isFinite(o.pmp)
        ? o.pmp
        : o.pmp != null && o.pmp !== "" && Number.isFinite(Number(o.pmp))
          ? Number(o.pmp)
          : null,
    attributeValues,
    unitLabel: o.unitLabel != null && String(o.unitLabel).trim() ? String(o.unitLabel).trim() : null,
  };
}

export class VariantSearchRequest {
  static async search(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<VariantSearchResult> {
    const headers = await authHeaders();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
    const q = new URLSearchParams();
    const trimmed = params.q?.trim();
    if (trimmed) {
      q.set("q", trimmed);
    }
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    try {
      const res = await fetch(apiUrl(`product-variants/purchasing-search?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const fail = apiFailure(res, json);
        return {
          items: [],
          page: 1,
          pageSize,
          total: 0,
          unauthorized: fail.unauthorized,
        };
      }
      if (!json || typeof json !== "object") {
        return { items: [], page: 1, pageSize, total: 0 };
      }
      const body = json as Record<string, unknown>;
      const itemsRaw = body.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.map(normalizeItem).filter((x): x is VariantSearchItem => x != null)
        : [];
      const total =
        typeof body.total === "number" && Number.isFinite(body.total) ? Math.max(0, body.total) : items.length;
      const p = typeof body.page === "number" && Number.isFinite(body.page) ? body.page : page;
      const ps =
        typeof body.pageSize === "number" && Number.isFinite(body.pageSize) ? body.pageSize : pageSize;
      return { items, page: p, pageSize: ps, total };
    } catch {
      return { items: [], page: 1, pageSize, total: 0 };
    }
  }
}
