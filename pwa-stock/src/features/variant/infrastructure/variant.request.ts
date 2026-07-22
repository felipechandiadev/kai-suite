import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { VariantPriceListItem } from "@/features/variant-pricing/types/pricing.types";
import type { VariantDetail, VariantLookupItem } from "../types/variant.types";
import type { VariantMediaAsset } from "@/features/variant-multimedia/types/multimedia.types";

function parsePriceListItems(raw: unknown): VariantPriceListItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item): VariantPriceListItem | null => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const p = item as Record<string, unknown>;
      const priceListId = p.priceListId != null ? String(p.priceListId) : "";
      const pl = p.priceList && typeof p.priceList === "object" ? (p.priceList as Record<string, unknown>) : null;
      const priceListName =
        p.priceListName != null && String(p.priceListName).trim()
          ? String(p.priceListName).trim()
          : pl?.name != null && String(pl.name).trim()
            ? String(pl.name).trim()
            : "";
      const currency =
        p.currency != null && String(p.currency).trim()
          ? String(p.currency).trim()
          : pl?.currency != null && String(pl.currency).trim()
            ? String(pl.currency).trim()
            : "CLP";
      const net = typeof p.netPrice === "number" ? p.netPrice : Number(p.netPrice) || 0;
      const gross = typeof p.grossPrice === "number" ? p.grossPrice : Number(p.grossPrice) || 0;
      if (!priceListId) {
        return null;
      }
      return {
        priceListId,
        priceListName,
        currency,
        netPrice: net,
        grossPrice: gross,
        taxIds: Array.isArray(p.taxIds) ? p.taxIds.map(String) : undefined,
        maxDiscountPercent:
          p.maxDiscountPercent != null && Number.isFinite(Number(p.maxDiscountPercent))
            ? Number(p.maxDiscountPercent)
            : null,
        minPrice:
          p.minPrice != null && Number.isFinite(Number(p.minPrice))
            ? Math.round(Number(p.minPrice))
            : null,
      };
    })
    .filter((x): x is VariantPriceListItem => x != null);
}

function parseAttributeValues(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const val = v == null ? "" : String(v).trim();
    if (val) out[String(k).trim()] = val;
  }
  return out;
}

function parseMediaAssets(raw: unknown): VariantMediaAsset[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item): VariantMediaAsset | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const publicUrl = o.publicUrl != null ? String(o.publicUrl) : "";
      if (!id || !publicUrl) return null;
      return {
        id,
        publicUrl,
        mimeType: o.mimeType != null ? String(o.mimeType) : "",
        kind: o.kind != null ? String(o.kind) : "",
      };
    })
    .filter((x): x is VariantMediaAsset => x != null);
}

function mapLookupItem(data: Record<string, unknown>): VariantLookupItem | null {
  const variantId = data.variantId != null ? String(data.variantId) : "";
  if (!variantId) return null;
  return {
    variantId,
    sku: data.sku != null ? String(data.sku) : "",
    barcode: data.barcode != null && String(data.barcode).trim() ? String(data.barcode) : null,
    productName: data.productName != null ? String(data.productName) : "",
    attributeValues: parseAttributeValues(data.attributeValues),
  };
}

export class VariantRequest {
  static async lookupByCode(
    code: string,
    mode: "barcode" | "sku",
  ): Promise<
    | { success: true; items: VariantLookupItem[] }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    const q = new URLSearchParams({ value: code.trim(), by: mode });
    try {
      const res = await fetch(apiUrl(`product-variants/scan/by-code?${q}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      if (data.variantId) {
        const one = mapLookupItem(data);
        return { success: true, items: one ? [one] : [] };
      }
      const itemsRaw = data.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw
            .map((x) =>
              x && typeof x === "object" ? mapLookupItem(x as Record<string, unknown>) : null,
            )
            .filter((x): x is VariantLookupItem => x != null)
        : [];
      return { success: true, items };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al buscar variante",
      };
    }
  }

  static async getById(
    variantId: string,
  ): Promise<
    | { success: true; variant: VariantDetail }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`product-variants/${variantId}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      const product = data.product as Record<string, unknown> | undefined;
      const productType =
        product?.productType != null ? String(product.productType) : null;
      const isService = String(productType || "").toUpperCase() === "SERVICE";
      const trackInventory =
        typeof data.trackInventory === "boolean"
          ? data.trackInventory
          : !isService;
      const pmpRaw = data.pmp;
      const pmp =
        typeof pmpRaw === "number" && Number.isFinite(pmpRaw)
          ? pmpRaw
          : pmpRaw != null && String(pmpRaw).trim() !== ""
            ? Number(pmpRaw)
            : null;
      return {
        success: true,
        variant: {
          variantId: String(data.id ?? variantId),
          productId: data.productId != null ? String(data.productId) : null,
          sku: data.sku != null ? String(data.sku) : "",
          barcode:
            data.barcode != null && String(data.barcode).trim() ? String(data.barcode) : null,
          productName: product?.name != null ? String(product.name) : "",
          attributeValues: parseAttributeValues(data.attributeValues),
          unitOfMeasure: (() => {
            const u = data.stockBaseUnit ?? data.unit;
            if (!u || typeof u !== "object") return "";
            const o = u as Record<string, unknown>;
            return String(o.symbol || o.name || "").trim();
          })(),
          pmp: pmp != null && Number.isFinite(pmp) ? pmp : null,
          priceListItems: parsePriceListItems(data.priceListItems),
          mediaAssets: parseMediaAssets(data.mediaAssets),
          productType,
          trackInventory,
          allowNegativeStock: data.allowNegativeStock === true,
          minimumStock:
            typeof data.minimumStock === "number" && Number.isFinite(data.minimumStock)
              ? data.minimumStock
              : Number(data.minimumStock) || 0,
          minimumStockEnabled: data.minimumStockEnabled === true,
          maximumStock:
            typeof data.maximumStock === "number" && Number.isFinite(data.maximumStock)
              ? data.maximumStock
              : Number(data.maximumStock) || 0,
          maximumStockEnabled: data.maximumStockEnabled === true,
          reorderPoint:
            typeof data.reorderPoint === "number" && Number.isFinite(data.reorderPoint)
              ? data.reorderPoint
              : Number(data.reorderPoint) || 0,
          reorderPointEnabled: data.reorderPointEnabled === true,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar variante",
      };
    }
  }

  static async updateInventoryPartial(
    variantId: string,
    input: {
      trackInventory: boolean;
      allowNegativeStock: boolean;
      minimumStock: number;
      minimumStockEnabled: boolean;
      maximumStock: number;
      maximumStockEnabled: boolean;
      reorderPoint: number;
      reorderPointEnabled: boolean;
    },
  ): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          trackInventory: input.trackInventory,
          allowNegativeStock: input.allowNegativeStock,
          minimumStock: Math.max(0, Math.round(Number(input.minimumStock) || 0)),
          minimumStockEnabled: Boolean(input.minimumStockEnabled),
          maximumStock: Math.max(0, Math.round(Number(input.maximumStock) || 0)),
          maximumStockEnabled: Boolean(input.maximumStockEnabled),
          reorderPoint: Math.max(0, Math.round(Number(input.reorderPoint) || 0)),
          reorderPointEnabled: Boolean(input.reorderPointEnabled),
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al guardar configuración de inventario",
      };
    }
  }

  static async updateBarcode(
    variantId: string,
    barcode: string,
  ): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`product-variants/${variantId}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ barcode }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al actualizar código",
      };
    }
  }
}
