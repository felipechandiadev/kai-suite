import { apiUrl, authHeaders } from "./api-auth";
import type {
  PurchasingVariantSearchResult,
  PurchasingVariantStorageStock,
} from "../types/purchasing-document.types";

function normalizeStorageStock(row: unknown): PurchasingVariantStorageStock | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const storageId = o.storageId != null ? String(o.storageId) : "";
  if (!storageId) return null;
  const available =
    typeof o.availableStock === "number" && Number.isFinite(o.availableStock)
      ? o.availableStock
      : Number.isFinite(Number(o.availableStock))
        ? Number(o.availableStock)
        : 0;
  return {
    storageId,
    storageName: o.storageName != null ? String(o.storageName) : "",
    branchName:
      o.branchName != null && String(o.branchName).trim() ? String(o.branchName).trim() : null,
    availableStock: available,
    hasStockAlert: o.hasStockAlert === true,
  };
}

function normalizeItem(row: unknown): PurchasingVariantSearchResult["items"][number] | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const avRaw = o.attributeValues;
  const attributeValues: Record<string, string> =
    avRaw != null && typeof avRaw === "object" && !Array.isArray(avRaw)
      ? Object.fromEntries(
          Object.entries(avRaw as Record<string, unknown>)
            .map(([k, v]) => [String(k), v == null ? "" : String(v)])
            .filter(([, v]) => v.trim() !== ""),
        )
      : {};
  const taxRaw = o.defaultTaxIds;
  const defaultTaxIds = Array.isArray(taxRaw) ? taxRaw.map((x) => String(x)) : [];
  const storageRaw = o.storageStocks;
  const storageStocks = Array.isArray(storageRaw)
    ? storageRaw.map(normalizeStorageStock).filter((x): x is NonNullable<typeof x> => x != null)
    : [];
  const hasStockAlert = o.hasStockAlert === true;
  return {
    id,
    productId: o.productId != null ? String(o.productId) : "",
    productName: o.productName != null ? String(o.productName) : "",
    categoryName:
      o.categoryName != null && String(o.categoryName).trim() ? String(o.categoryName).trim() : null,
    sku: o.sku != null ? String(o.sku) : "",
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode).trim() : null,
    pmp:
      o.pmp == null || o.pmp === ""
        ? null
        : typeof o.pmp === "number" && Number.isFinite(o.pmp)
          ? o.pmp
          : Number.isFinite(Number(o.pmp))
            ? Number(o.pmp)
            : null,
    suggestedPurchaseUnitCost:
      o.suggestedPurchaseUnitCost == null || o.suggestedPurchaseUnitCost === ""
        ? null
        : Number.isFinite(Number(o.suggestedPurchaseUnitCost))
          ? Number(o.suggestedPurchaseUnitCost)
          : null,
    purchaseUnitLabel:
      o.purchaseUnitLabel != null && String(o.purchaseUnitLabel).trim()
        ? String(o.purchaseUnitLabel).trim()
        : null,
  stockBaseUnitLabel:
      o.stockBaseUnitLabel != null && String(o.stockBaseUnitLabel).trim()
        ? String(o.stockBaseUnitLabel).trim()
        : null,
    stockQtyPerPurchaseUnit:
      o.stockQtyPerPurchaseUnit == null || o.stockQtyPerPurchaseUnit === ""
        ? undefined
        : Number.isFinite(Number(o.stockQtyPerPurchaseUnit)) && Number(o.stockQtyPerPurchaseUnit) > 0
          ? Number(o.stockQtyPerPurchaseUnit)
          : undefined,
    attributeValues,
    unitLabel:
      (o.purchaseUnitLabel != null && String(o.purchaseUnitLabel).trim()
        ? String(o.purchaseUnitLabel).trim()
        : null) ??
      (o.unitLabel != null && String(o.unitLabel).trim() ? String(o.unitLabel).trim() : null),
    defaultTaxIds,
    storageStocks,
    hasStockAlert,
  };
}

export class PurchasingVariantSearchPosRequest {
  static async search(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PurchasingVariantSearchResult> {
    const headers = await authHeaders();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
    const q = new URLSearchParams();
    const trimmed = params.q?.trim();
    if (trimmed) q.set("q", trimmed);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    try {
      const res = await fetch(apiUrl(`product-variants/purchasing-search?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { items: [], page: 1, pageSize, total: 0 };
      }
      const json = (await res.json()) as Record<string, unknown>;
      const itemsRaw = json.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.map(normalizeItem).filter((x): x is NonNullable<typeof x> => x != null)
        : [];
      const total =
        typeof json.total === "number" && Number.isFinite(json.total) ? Math.max(0, json.total) : items.length;
      return {
        items,
        page: typeof json.page === "number" ? json.page : page,
        pageSize: typeof json.pageSize === "number" ? json.pageSize : pageSize,
        total,
      };
    } catch {
      return { items: [], page: 1, pageSize, total: 0 };
    }
  }
}
