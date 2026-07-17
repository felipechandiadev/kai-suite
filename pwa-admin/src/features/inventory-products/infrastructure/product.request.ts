import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { throwIfUnauthorizedStatus, isUnauthorizedSessionError } from "@/lib/auth/unauthorized-session";
import type {
  ProductGridRow,
  ProductPriceListItemRow,
  ProductVariantGridRow,
  ProductVariantMediaAsset,
} from "../types/product-grid.types";
import {
  DEFAULT_VARIANT_TAX_CATEGORY,
  isVariantTaxCategory,
  normalizeVariantTaxCategory,
} from "../types/variant-fiscal.types";
import { resolveMultimediaPublicUrl } from "@/features/multimedia/utils/resolve-multimedia-public-url";
import type { VariantSalePriceHistoryResponse } from "../types/variant-sale-price-history.types";

function parseAttributeValuesRecord(raw: unknown): Record<string, string> | undefined {
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (typeof p === "object" && p != null && !Array.isArray(p)) {
        return parseAttributeValuesRecord(p);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const val = v == null ? "" : String(v).trim();
      if (val) {
        out[String(k).trim()] = val;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

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

function formatUnitRelation(u: unknown): string | null {
  if (!u || typeof u !== "object") {
    return null;
  }
  const r = u as Record<string, unknown>;
  const sym = r.symbol != null && String(r.symbol).trim() ? String(r.symbol).trim() : "";
  const nm = r.name != null && String(r.name).trim() ? String(r.name).trim() : "";
  if (nm && sym) {
    return `${nm} (${sym})`;
  }
  return sym || nm || null;
}

function normalizeMediaAssets(raw: unknown): ProductVariantMediaAsset[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const mediaAssets = raw
    .map((m): ProductVariantMediaAsset | null => {
      if (!m || typeof m !== "object") {
        return null;
      }
      const x = m as Record<string, unknown>;
      const mid = x.id != null ? String(x.id) : "";
      const url = x.publicUrl != null ? String(x.publicUrl) : "";
      if (!mid || !url) {
        return null;
      }
      return {
        id: mid,
        publicUrl: resolveMultimediaPublicUrl(url),
        mimeType: x.mimeType != null ? String(x.mimeType) : "",
        kind: x.kind != null ? String(x.kind) : "",
      };
    })
    .filter((x): x is ProductVariantMediaAsset => x != null);
  return mediaAssets.length > 0 ? mediaAssets : undefined;
}

function normalizeVariant(v: unknown): ProductVariantGridRow | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const sku = o.sku != null ? String(o.sku) : "";
  if (!id) {
    return null;
  }
  const plRaw = o.priceListItems;
  const priceListItems: ProductPriceListItemRow[] = Array.isArray(plRaw)
    ? plRaw
        .map((item): ProductPriceListItemRow | null => {
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
          const updatedAtRaw = p.updatedAt;
          const updatedAt =
            updatedAtRaw != null && String(updatedAtRaw).trim()
              ? String(updatedAtRaw).trim()
              : null;
          return {
            priceListId,
            priceListName,
            currency,
            netPrice: net,
            grossPrice: gross,
            taxIds: Array.isArray(p.taxIds) ? p.taxIds.map(String) : undefined,
            updatedAt,
          };
        })
        .filter((x): x is ProductPriceListItemRow => x != null)
    : [];
  const mediaAssets = normalizeMediaAssets(o.mediaAssets);
  const parseOptQty = (raw: unknown): number | null | undefined => {
    if (raw === undefined) {
      return undefined;
    }
    if (raw === null || raw === "") {
      return null;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n;
  };

  const parseNullableDecimal = (raw: unknown): number | null => {
    if (raw == null || raw === "") {
      return null;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  let unitOfMeasure: string | null =
    o.unitOfMeasure != null && String(o.unitOfMeasure).trim() ? String(o.unitOfMeasure).trim() : null;
  if (!unitOfMeasure && o.unit && typeof o.unit === "object") {
    const u = o.unit as Record<string, unknown>;
    const sym = u.symbol != null && String(u.symbol).trim() ? String(u.symbol).trim() : "";
    const nm = u.name != null && String(u.name).trim() ? String(u.name).trim() : "";
    unitOfMeasure = sym ? `${nm} (${sym})` : nm || null;
  }

  const saleUnitLabel = formatUnitRelation(o.saleUnit) ?? unitOfMeasure;
  const stockBaseUnitLabel = formatUnitRelation(o.stockBaseUnit);
  const purchaseUnitLabel = formatUnitRelation(o.purchaseUnit);

  return {
    id,
    sku: sku || "—",
    productId: o.productId != null ? String(o.productId) : undefined,
    unitId: o.unitId != null ? String(o.unitId) : undefined,
    stockBaseUnitId: o.stockBaseUnitId != null ? String(o.stockBaseUnitId) : undefined,
    saleUnitId: o.saleUnitId != null ? String(o.saleUnitId) : undefined,
    purchaseUnitId: o.purchaseUnitId != null ? String(o.purchaseUnitId) : undefined,
    stockBaseQtyPerCountSaleUnit: parseOptQty(o.stockBaseQtyPerCountSaleUnit),
    stockBaseQtyPerCountPurchaseUnit: parseOptQty(o.stockBaseQtyPerCountPurchaseUnit),
    barcode: o.barcode != null && String(o.barcode).trim() ? String(o.barcode) : null,
    saleUnitLabel,
    stockBaseUnitLabel,
    purchaseUnitLabel,
    unitOfMeasure,
    isActive: o.isActive !== false,
    visibleInEShop: o.visibleInEShop === true,
    basePrice: typeof o.basePrice === "number" ? o.basePrice : o.basePrice != null ? Number(o.basePrice) : undefined,
    baseCost: typeof o.baseCost === "number" ? o.baseCost : o.baseCost != null ? Number(o.baseCost) : undefined,
    pmp:
      typeof o.pmp === "number" && Number.isFinite(o.pmp)
        ? o.pmp
        : o.pmp != null && o.pmp !== "" && Number.isFinite(Number(o.pmp))
          ? Number(o.pmp)
          : null,
    displayName:
      o.displayName != null && String(o.displayName).trim() ? String(o.displayName).trim() : null,
    attributeValues: parseAttributeValuesRecord(o.attributeValues),
    trackInventory: typeof o.trackInventory === "boolean" ? o.trackInventory : undefined,
    allowNegativeStock: typeof o.allowNegativeStock === "boolean" ? o.allowNegativeStock : undefined,
    minimumStock:
      typeof o.minimumStock === "number"
        ? o.minimumStock
        : o.minimumStock != null
          ? Math.max(0, Math.round(Number(o.minimumStock)))
          : undefined,
    minimumStockEnabled:
      typeof o.minimumStockEnabled === "boolean" ? o.minimumStockEnabled : undefined,
    maximumStock:
      typeof o.maximumStock === "number"
        ? o.maximumStock
        : o.maximumStock != null
          ? Math.max(0, Math.round(Number(o.maximumStock)))
          : undefined,
    maximumStockEnabled:
      typeof o.maximumStockEnabled === "boolean" ? o.maximumStockEnabled : undefined,
    reorderPoint:
      typeof o.reorderPoint === "number"
        ? o.reorderPoint
        : o.reorderPoint != null
          ? Math.max(0, Math.round(Number(o.reorderPoint)))
          : undefined,
    reorderPointEnabled:
      typeof o.reorderPointEnabled === "boolean" ? o.reorderPointEnabled : undefined,
    netWeightKg: parseNullableDecimal(o.netWeightKg),
    grossWeightKg: parseNullableDecimal(o.grossWeightKg),
    packageLengthCm: parseNullableDecimal(o.packageLengthCm),
    packageWidthCm: parseNullableDecimal(o.packageWidthCm),
    packageHeightCm: parseNullableDecimal(o.packageHeightCm),
    volumetricDivisorK: (() => {
      if (o.volumetricDivisorK == null || o.volumetricDivisorK === "") {
        return null;
      }
      const n = Math.round(Number(o.volumetricDivisorK));
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    primaryImageUrl:
      o.primaryImageUrl != null && String(o.primaryImageUrl).trim()
        ? resolveMultimediaPublicUrl(String(o.primaryImageUrl).trim())
        : null,
    mediaAssets: mediaAssets && mediaAssets.length > 0 ? mediaAssets : undefined,
    priceListItems,
    taxIds: Array.isArray(o.taxIds) ? o.taxIds.map(String).filter(Boolean) : undefined,
    taxCategory: isVariantTaxCategory(o.taxCategory)
      ? normalizeVariantTaxCategory(o.taxCategory)
      : DEFAULT_VARIANT_TAX_CATEGORY,
    requiresDte: o.requiresDte !== false,
  };
}

function normalizeProduct(row: unknown): ProductGridRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id || !name) {
    return null;
  }
  const variantsRaw = o.variants;
  const variants = Array.isArray(variantsRaw)
    ? variantsRaw.map(normalizeVariant).filter((x): x is ProductVariantGridRow => x != null)
    : [];
  const variantCount =
    typeof o.variantCount === "number" && Number.isFinite(o.variantCount)
      ? o.variantCount
      : variants.length;

  const categoryIdRaw = o.categoryId;
  const categoryId =
    categoryIdRaw != null && String(categoryIdRaw).trim() ? String(categoryIdRaw).trim() : null;
  const categoryNameRaw = o.categoryName;
  const categoryName =
    categoryNameRaw != null && String(categoryNameRaw).trim() ? String(categoryNameRaw).trim() : null;

  const brandIdRaw = o.brandId ?? o.brand_id;
  const brandId =
    brandIdRaw != null && String(brandIdRaw).trim() ? String(brandIdRaw).trim() : null;

  const productMediaAssets = normalizeMediaAssets(o.mediaAssets);

  return {
    id,
    name,
    productType: o.productType != null && String(o.productType).trim() ? String(o.productType).trim() : null,
    brandId,
    brand: o.brand != null && String(o.brand).trim() ? String(o.brand).trim() : null,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    categoryId,
    categoryName,
    isActive: o.isActive !== false,
    visibleInEShop: o.visibleInEShop === true,
    variantCount,
    variants,
    primaryImageUrl:
      o.primaryImageUrl != null && String(o.primaryImageUrl).trim()
        ? resolveMultimediaPublicUrl(String(o.primaryImageUrl).trim())
        : productMediaAssets?.[0]?.publicUrl ?? null,
    mediaAssets: productMediaAssets,
  };
}

export class ProductRequest {
  /**
   * Lista productos con variantes (search del backend; sin paginación server-side real).
   * `pageSize` alto para armar paginación en el servidor de la página.
   */
  /** pageSize máx. 50 por validación del DTO en `GET /products`. */
  static async searchProducts(
    query: string,
    pageSize = 50,
    productType?: string,
  ): Promise<ProductGridRow[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (query.trim()) {
      q.set("query", query.trim());
    }
    if (productType?.trim()) {
      q.set("productType", productType.trim());
    }
    q.set("pageSize", String(Math.min(50, Math.max(1, pageSize))));
    q.set("page", "1");
    try {
      const res = await fetch(apiUrl(`products?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        throwIfUnauthorizedStatus(res.status);
        const body = await res.text().catch(() => "");
        console.error(
          `[ProductRequest.searchProducts] ${res.status} ${res.statusText}`,
          body.slice(0, 300),
        );
        return [];
      }
      const json = (await res.json()) as unknown;
      const list = Array.isArray(json)
        ? json
        : json &&
            typeof json === "object" &&
            Array.isArray((json as { data?: unknown }).data)
          ? (json as { data: unknown[] }).data
          : null;
      if (!list) {
        return [];
      }
      return list.map(normalizeProduct).filter((x): x is ProductGridRow => x != null);
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        throw e;
      }
      console.error("[ProductRequest.searchProducts]", e);
      return [];
    }
  }

  /** Resuelve un producto del catálogo por ID (usa búsqueda exacta por UUID). */
  static async getProductForGridById(id: string): Promise<ProductGridRow | null> {
    const trimmed = id.trim();
    if (!trimmed) {
      return null;
    }
    const rows = await ProductRequest.searchProducts(trimmed, 1);
    return rows.find((r) => r.id === trimmed) ?? null;
  }

  static async create(body: {
    name: string;
    categoryId?: string;
    brandId?: string | null;
    brand?: string;
    description?: string;
    productType?: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
    visibleInEShop?: boolean;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      isActive: body.isActive !== false,
      visibleInEShop: body.visibleInEShop === true,
    };
    if (body.categoryId?.trim()) {
      payload.categoryId = body.categoryId.trim();
    }
    if (body.brandId != null && String(body.brandId).trim()) {
      payload.brandId = String(body.brandId).trim();
    }
    if (body.brand?.trim()) {
      payload.brand = body.brand.trim();
    }
    if (body.description?.trim()) {
      payload.description = body.description.trim();
    }
    if (body.productType?.trim()) {
      payload.productType = body.productType.trim();
    }
    if (body.metadata && typeof body.metadata === "object") {
      payload.metadata = body.metadata;
    }
    try {
      const res = await fetch(apiUrl("products"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const id = data.id != null ? String(data.id) : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear producto";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      name: string;
      categoryId?: string;
      brandId?: string | null;
      brand?: string;
      description?: string;
      productType?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
      visibleInEShop?: boolean;
    },
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      isActive: body.isActive !== false,
      visibleInEShop: body.visibleInEShop === true,
    };
    if (body.categoryId?.trim()) {
      payload.categoryId = body.categoryId.trim();
    }
    if (body.brandId !== undefined) {
      payload.brandId = body.brandId != null && String(body.brandId).trim() ? String(body.brandId).trim() : null;
    }
    if (body.brand?.trim()) {
      payload.brand = body.brand.trim();
    }
    if (body.description?.trim()) {
      payload.description = body.description.trim();
    }
    if (body.productType?.trim()) {
      payload.productType = body.productType.trim();
    }
    if (body.metadata && typeof body.metadata === "object") {
      payload.metadata = body.metadata;
    }
    try {
      const res = await fetch(apiUrl(`products/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar producto";
      return { success: false, error: err };
    }
  }

  static async patchFields(
    id: string,
    body: {
      isActive?: boolean;
      visibleInEShop?: boolean;
    },
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {};
    if (body.isActive !== undefined) {
      payload.isActive = body.isActive;
    }
    if (body.visibleInEShop !== undefined) {
      payload.visibleInEShop = body.visibleInEShop;
    }
    if (Object.keys(payload).length === 0) {
      return { success: false, error: "Sin campos para actualizar" };
    }
    try {
      const res = await fetch(apiUrl(`products/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar producto";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`products/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar producto";
      return { success: false, error: err };
    }
  }

  static async createVariant(body: {
    productId: string;
    sku: string;
    barcode?: string | null;
    basePrice: number;
    unitId: string;
    stockBaseUnitId: string;
    purchaseUnitId: string;
    stockBaseQtyPerCountSaleUnit?: number;
    stockBaseQtyPerCountPurchaseUnit?: number;
    isActive?: boolean;
    visibleInEShop?: boolean;
    priceListItems: Array<{
      priceListId: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
    }>;
    attributeValues?: Record<string, string>;
    trackInventory?: boolean;
    allowNegativeStock?: boolean;
    minimumStock?: number;
    minimumStockEnabled?: boolean;
    maximumStock?: number;
    maximumStockEnabled?: boolean;
    reorderPoint?: number;
    reorderPointEnabled?: boolean;
    netWeightKg?: number | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Number.isFinite(body.basePrice) ? Math.round(body.basePrice) : 0,
      unitId: body.unitId,
      stockBaseUnitId: body.stockBaseUnitId,
      purchaseUnitId: body.purchaseUnitId,
      isActive: body.isActive !== false,
      visibleInEShop: body.visibleInEShop === true,
      priceListItems: body.priceListItems.map((item) => ({
        priceListId: item.priceListId,
        netPrice: Math.round(Number(item.netPrice)) || 0,
        grossPrice: Math.round(Number(item.grossPrice)) || 0,
        taxIds:
          Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
      })),
    };
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    if (body.attributeValues != null && Object.keys(body.attributeValues).length > 0) {
      payload.attributeValues = body.attributeValues;
    }
    if (typeof body.trackInventory === "boolean") {
      payload.trackInventory = body.trackInventory;
    }
    if (typeof body.allowNegativeStock === "boolean") {
      payload.allowNegativeStock = body.allowNegativeStock;
    }
    if (body.minimumStock != null) {
      payload.minimumStock = Math.max(0, Math.round(Number(body.minimumStock) || 0));
    }
    if (typeof body.minimumStockEnabled === "boolean") {
      payload.minimumStockEnabled = body.minimumStockEnabled;
    }
    if (body.maximumStock != null) {
      payload.maximumStock = Math.max(0, Math.round(Number(body.maximumStock) || 0));
    }
    if (typeof body.maximumStockEnabled === "boolean") {
      payload.maximumStockEnabled = body.maximumStockEnabled;
    }
    if (body.reorderPoint != null) {
      payload.reorderPoint = Math.max(0, Math.round(Number(body.reorderPoint) || 0));
    }
    if (typeof body.reorderPointEnabled === "boolean") {
      payload.reorderPointEnabled = body.reorderPointEnabled;
    }
    if (body.stockBaseQtyPerCountSaleUnit != null) {
      payload.stockBaseQtyPerCountSaleUnit = body.stockBaseQtyPerCountSaleUnit;
    }
    if (body.stockBaseQtyPerCountPurchaseUnit != null) {
      payload.stockBaseQtyPerCountPurchaseUnit = body.stockBaseQtyPerCountPurchaseUnit;
    }
    if (body.netWeightKg !== undefined && body.netWeightKg !== null) {
      payload.netWeightKg = body.netWeightKg;
    }
    try {
      const res = await fetch(apiUrl("product-variants"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      if (data.success === false) {
        const err = typeof data.error === "string" && data.error.trim() ? data.error.trim() : "Error al crear variante";
        return { success: false, error: err };
      }
      const variant = data.variant as Record<string, unknown> | undefined;
      const id =
        variant?.id != null
          ? String(variant.id)
          : data.id != null
            ? String(data.id)
            : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear variante";
      return { success: false, error: err };
    }
  }

  static async updateVariant(
    variantId: string,
    body: {
      productId: string;
      sku: string;
      barcode?: string | null;
      basePrice: number;
      unitId: string;
      stockBaseUnitId: string;
      purchaseUnitId: string;
      stockBaseQtyPerCountSaleUnit?: number;
      stockBaseQtyPerCountPurchaseUnit?: number;
      isActive?: boolean;
      priceListItems: Array<{
        priceListId: string;
        netPrice: number;
        grossPrice: number;
        taxIds?: string[];
      }>;
      attributeValues?: Record<string, string>;
      trackInventory?: boolean;
      allowNegativeStock?: boolean;
      minimumStock?: number;
      minimumStockEnabled?: boolean;
      maximumStock?: number;
      maximumStockEnabled?: boolean;
      reorderPoint?: number;
      reorderPointEnabled?: boolean;
      netWeightKg?: number | null;
      grossWeightKg?: number | null;
      packageLengthCm?: number | null;
      packageWidthCm?: number | null;
      packageHeightCm?: number | null;
      volumetricDivisorK?: number | null;
    },
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Number.isFinite(body.basePrice) ? Math.round(body.basePrice) : 0,
      unitId: body.unitId,
      stockBaseUnitId: body.stockBaseUnitId,
      purchaseUnitId: body.purchaseUnitId,
      isActive: body.isActive !== false,
      priceListItems: body.priceListItems.map((item) => ({
        priceListId: item.priceListId,
        netPrice: Math.round(Number(item.netPrice)) || 0,
        grossPrice: Math.round(Number(item.grossPrice)) || 0,
        taxIds:
          Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
      })),
    };
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    if (body.attributeValues != null && Object.keys(body.attributeValues).length > 0) {
      payload.attributeValues = body.attributeValues;
    }
    if (typeof body.trackInventory === "boolean") {
      payload.trackInventory = body.trackInventory;
    }
    if (typeof body.allowNegativeStock === "boolean") {
      payload.allowNegativeStock = body.allowNegativeStock;
    }
    if (body.minimumStock != null) {
      payload.minimumStock = Math.max(0, Math.round(Number(body.minimumStock) || 0));
    }
    if (typeof body.minimumStockEnabled === "boolean") {
      payload.minimumStockEnabled = body.minimumStockEnabled;
    }
    if (body.maximumStock != null) {
      payload.maximumStock = Math.max(0, Math.round(Number(body.maximumStock) || 0));
    }
    if (typeof body.maximumStockEnabled === "boolean") {
      payload.maximumStockEnabled = body.maximumStockEnabled;
    }
    if (body.reorderPoint != null) {
      payload.reorderPoint = Math.max(0, Math.round(Number(body.reorderPoint) || 0));
    }
    if (typeof body.reorderPointEnabled === "boolean") {
      payload.reorderPointEnabled = body.reorderPointEnabled;
    }
    if (body.stockBaseQtyPerCountSaleUnit != null) {
      payload.stockBaseQtyPerCountSaleUnit = body.stockBaseQtyPerCountSaleUnit;
    }
    if (body.stockBaseQtyPerCountPurchaseUnit != null) {
      payload.stockBaseQtyPerCountPurchaseUnit = body.stockBaseQtyPerCountPurchaseUnit;
    }
    if (body.netWeightKg !== undefined) {
      payload.netWeightKg = body.netWeightKg;
    }
    if (body.grossWeightKg !== undefined) {
      payload.grossWeightKg = body.grossWeightKg;
    }
    if (body.packageLengthCm !== undefined) {
      payload.packageLengthCm = body.packageLengthCm;
    }
    if (body.packageWidthCm !== undefined) {
      payload.packageWidthCm = body.packageWidthCm;
    }
    if (body.packageHeightCm !== undefined) {
      payload.packageHeightCm = body.packageHeightCm;
    }
    if (body.volumetricDivisorK !== undefined) {
      payload.volumetricDivisorK = body.volumetricDivisorK;
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      if (data.success === false) {
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Error al actualizar variante";
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar variante";
      return { success: false, error: err };
    }
  }

  static async fetchVariantById(
    variantId: string,
  ): Promise<
    | {
        ok: true;
        variant: ProductVariantGridRow;
        product: { id: string; name: string; productType: string | null; categoryName?: string | null; brand?: string | null };
      }
    | { ok: false; error: string }
  > {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { ok: false, error: "Variante no válida" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || !raw || typeof raw !== "object") {
        return { ok: false, error: res.status === 404 ? "Variante no encontrada" : res.statusText };
      }
      const prod = raw.product && typeof raw.product === "object" ? (raw.product as Record<string, unknown>) : null;
      const productId = raw.productId != null ? String(raw.productId) : prod?.id != null ? String(prod.id) : "";
      const productName = prod?.name != null && String(prod.name).trim() ? String(prod.name).trim() : "—";
      const productType =
        prod?.productType != null && String(prod.productType).trim()
          ? String(prod.productType).trim()
          : null;
      const categoryName =
        prod?.category && typeof prod.category === "object"
          ? String((prod.category as Record<string, unknown>).name ?? "").trim() || null
          : prod?.categoryName != null && String(prod.categoryName).trim()
            ? String(prod.categoryName).trim()
            : null;
      const catalogBrand =
        prod?.catalogBrand && typeof prod.catalogBrand === "object"
          ? String((prod.catalogBrand as Record<string, unknown>).name ?? "").trim() || null
          : null;
      const brandLegacy =
        prod?.brand != null && String(prod.brand).trim() ? String(prod.brand).trim() : null;
      const brand = catalogBrand ?? brandLegacy ?? null;
      const merged = { ...raw, productId: productId || raw.productId };
      const variant = normalizeVariant(merged);
      if (!variant) {
        return { ok: false, error: "Respuesta inválida" };
      }
      return {
        ok: true,
        variant,
        product: { id: productId, name: productName, productType, categoryName, brand },
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
    }
  }

  static async patchVariantFields(
    variantId: string,
    body: Record<string, unknown>,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      if (data.success === false) {
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Error al actualizar variante";
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar variante";
      return { success: false, error: err };
    }
  }

  static async getVariantSalePriceHistory(
    variantId: string,
    opts?: { priceListId?: string; limit?: number },
  ): Promise<
    { success: true; data: VariantSalePriceHistoryResponse } | { success: false; error: string }
  > {
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    const q = new URLSearchParams();
    if (opts?.priceListId?.trim()) {
      q.set("priceListId", opts.priceListId.trim());
    }
    if (opts?.limit != null && opts.limit > 0) {
      q.set("limit", String(Math.min(500, opts.limit)));
    }
    const qs = q.toString();
    try {
      const headers = await authHeaders();
      const res = await fetch(
        apiUrl(`product-variants/${encodeURIComponent(id)}/sale-price-history${qs ? `?${qs}` : ""}`),
        { headers, cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = body.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const data = body.data as VariantSalePriceHistoryResponse | undefined;
      if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, data };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar historial de precios";
      return { success: false, error: err };
    }
  }

  static async removeVariant(
    variantId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    if (!id) {
      return { success: false, error: "Variante no válida" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar variante";
      return { success: false, error: err };
    }
  }
}
