"use server";

import { revalidatePath } from "next/cache";
import { ProductRequest } from "../infrastructure/product.request";
import type { CatalogProductType, ProductGridRow } from "../types/product-grid.types";
import type { VariantTaxCategory } from "../types/variant-fiscal.types";
import { latinSearchIncludes } from "@/shared/utils/fold-latin-search-text";

const PRODUCTS_PATH = "/catalog/products";
const PRODUCT_VARIANT_DETAIL_PATH_PREFIX = "/catalog/products/variants";

export type CreateProductFormInput = {
  name: string;
  categoryId?: string;
  brandId?: string | null;
  brand?: string;
  description?: string;
  productType?: CatalogProductType;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  visibleInEShop?: boolean;
};

export type UpdateProductFormInput = {
  id: string;
  name: string;
  categoryId?: string;
  /** null quita la marca del catálogo en el producto. */
  brandId: string | null;
  brand?: string;
  description?: string;
  productType?: CatalogProductType;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  visibleInEShop?: boolean;
};

export type UpdateProductResult = { success: true } | { success: false; error: string };

export type DeleteProductResult = { success: true } | { success: false; error: string };

export type CreateProductResult = { success: true; id: string } | { success: false; error: string };

export type CreateProductVariantPriceListItemInput = {
  priceListId: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
};

export type CreateProductVariantFormInput = {
  productId: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  /** Unidad de venta / cotización (API legacy: `unitId`). */
  unitId: string;
  stockBaseUnitId?: string;
  purchaseUnitId?: string;
  isActive?: boolean;
  visibleInEShop?: boolean;
  priceListItems: CreateProductVariantPriceListItemInput[];
  /** Ignorado: el PMP lo asigna el backend con la primera compra valorada. */
  pmp?: number;
  /** Mapa attributeId → texto de opción (catálogo de atributos). Opcional. */
  attributeValues?: Record<string, string>;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  minimumStock?: number;
  minimumStockEnabled?: boolean;
  maximumStock?: number;
  maximumStockEnabled?: boolean;
  reorderPoint?: number;
  reorderPointEnabled?: boolean;
  /** Cantidad en unidad base de stock por 1 unidad de venta (conteo), si aplica. */
  stockBaseQtyPerCountSaleUnit?: number;
  /** Cantidad en unidad base de stock por 1 unidad de compra (conteo), si aplica. */
  stockBaseQtyPerCountPurchaseUnit?: number;
  /** Logística / courier. */
  netWeightKg?: number | null;
  grossWeightKg?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  volumetricDivisorK?: number | null;
};

export type CreateProductVariantResult = { success: true; id: string } | { success: false; error: string };

export type UpdateProductVariantResult = { success: true } | { success: false; error: string };

export type DeleteProductVariantResult = { success: true } | { success: false; error: string };

export type ListProductsForGridInput = {
  query: string;
  /** Filtra por tipo de producto (`productType` en API). */
  productType?: string;
  page: number;
  limit: number;
  sortField: string;
  sort: "asc" | "desc";
};

export type ListProductsForGridResult = {
  rows: ProductGridRow[];
  total: number;
  page: number;
  limit: number;
};

function productRowMatchesSearch(row: ProductGridRow, query: string): boolean {
  const q = query.trim();
  if (!q) {
    return true;
  }
  const fields: Array<string | null | undefined> = [
    row.name,
    row.brand,
    row.description,
    ...(row.variants ?? []).flatMap((v) => [v.sku, v.barcode, v.displayName]),
  ];
  return fields.some((f) => typeof f === "string" && f.length > 0 && latinSearchIncludes(f, q));
}

function compare(a: string | number | boolean | null | undefined, b: string | number | boolean | null | undefined): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b), "es", { sensitivity: "base" });
}

export async function listProductsForGrid(input: ListProductsForGridInput): Promise<ListProductsForGridResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(500, Math.max(1, input.limit));
  const sortField = input.sortField && input.sortField.trim() ? input.sortField.trim() : "name";
  const sortDir = input.sort === "desc" ? "desc" : "asc";

  const searchQuery = input.query?.trim() ?? "";
  // Catálogo completo desde API; el filtro de texto (tildes/mayúsculas/SKU/barcode) va aquí
  // para no depender de que PostgreSQL tenga `unaccent` en el endpoint GET /products.
  const all = await ProductRequest.searchProducts(
    "",
    50,
    input.productType?.trim() || undefined,
  );
  const filtered = searchQuery ? all.filter((row) => productRowMatchesSearch(row, searchQuery)) : all;
  const sorted = [...filtered].sort((r1, r2) => {
    let va: string | number | boolean | null | undefined;
    let vb: string | number | boolean | null | undefined;
    switch (sortField) {
      case "brand":
        va = r1.brand;
        vb = r2.brand;
        break;
      case "categoryName":
        va = r1.categoryName;
        vb = r2.categoryName;
        break;
      case "productType":
        va = (r1.productType ?? "PHYSICAL").toString();
        vb = (r2.productType ?? "PHYSICAL").toString();
        break;
      case "variantCount":
        va = r1.variantCount;
        vb = r2.variantCount;
        break;
      case "isActive":
        va = r1.isActive;
        vb = r2.isActive;
        break;
      case "visibleInEShop":
        va = r1.visibleInEShop === true;
        vb = r2.visibleInEShop === true;
        break;
      default:
        va = r1.name;
        vb = r2.name;
    }
    const c = compare(va, vb);
    return sortDir === "desc" ? -c : c;
  });

  const total = sorted.length;
  const start = (page - 1) * limit;
  const rows = sorted.slice(start, start + limit);

  return { rows, total, page, limit };
}

export async function createProductAction(input: CreateProductFormInput): Promise<CreateProductResult> {
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { success: false, error: "El nombre es obligatorio" };
  }
  const r = await ProductRequest.create({
    name,
    categoryId: input.categoryId?.trim() || undefined,
    brandId: input.brandId != null && String(input.brandId).trim() ? String(input.brandId).trim() : null,
    brand: input.brand?.trim() || undefined,
    description: input.description?.trim() || undefined,
    productType: input.productType,
    metadata: input.metadata,
    isActive: input.isActive !== false,
    visibleInEShop: input.visibleInEShop === true,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export type PatchProductGridFlagsResult =
  | { success: true }
  | { success: false; error: string };

export async function patchProductGridFlagsAction(input: {
  id: string;
  isActive?: boolean;
  visibleInEShop?: boolean;
}): Promise<PatchProductGridFlagsResult> {
  const id = input.id?.trim() ?? "";
  if (!id) {
    return { success: false, error: "Producto no válido" };
  }
  if (input.isActive === undefined && input.visibleInEShop === undefined) {
    return { success: false, error: "Sin campos para actualizar" };
  }
  const r = await ProductRequest.patchFields(id, {
    isActive: input.isActive,
    visibleInEShop: input.visibleInEShop,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function updateProductAction(input: UpdateProductFormInput): Promise<UpdateProductResult> {
  const id = input.id?.trim() ?? "";
  const name = input.name?.trim() ?? "";
  if (!id) {
    return { success: false, error: "Producto no válido" };
  }
  if (!name) {
    return { success: false, error: "El nombre es obligatorio" };
  }
  const r = await ProductRequest.update(id, {
    name,
    categoryId: input.categoryId?.trim() || undefined,
    brandId: input.brandId,
    brand: input.brand?.trim() || undefined,
    description: input.description?.trim() || undefined,
    productType: input.productType,
    metadata: input.metadata,
    isActive: input.isActive !== false,
    visibleInEShop: input.visibleInEShop === true,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function deleteProductAction(id: string): Promise<DeleteProductResult> {
  const trimmed = id?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Producto no válido" };
  }
  const r = await ProductRequest.remove(trimmed);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function createProductVariantAction(
  input: CreateProductVariantFormInput,
): Promise<CreateProductVariantResult> {
  const productId = input.productId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  const unitId = input.unitId?.trim() ?? "";
  if (!productId) {
    return { success: false, error: "Producto no válido" };
  }
  if (!sku) {
    return { success: false, error: "El SKU es obligatorio" };
  }
  if (!unitId) {
    return { success: false, error: "La unidad de medida es obligatoria" };
  }
  const items = input.priceListItems;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      error: "Debe indicar al menos un precio asociado a una lista de precios.",
    };
  }

  const basePrice = typeof input.basePrice === "number" && Number.isFinite(input.basePrice) ? input.basePrice : 0;
  if (basePrice < 0) {
    return { success: false, error: "El precio de referencia no puede ser negativo" };
  }

  let attributeValuesToSend: Record<string, string> | undefined;
  if (input.attributeValues != null && typeof input.attributeValues === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.attributeValues)) {
      const key = k.trim();
      if (!key) {
        continue;
      }
      const val = v == null ? "" : String(v).trim();
      if (val === "") {
        continue;
      }
      cleaned[key] = val;
    }
    if (Object.keys(cleaned).length > 0) {
      attributeValuesToSend = cleaned;
    }
  }

  const seen = new Set<string>();
  for (const it of items) {
    const lid = it.priceListId?.trim() ?? "";
    if (!lid) {
      return { success: false, error: "Cada precio por lista debe tener una lista de precios." };
    }
    if (seen.has(lid)) {
      return { success: false, error: "No puede repetir la misma lista de precios en más de una fila." };
    }
    seen.add(lid);
    const net = Math.round(Number(it.netPrice));
    const gross = Math.round(Number(it.grossPrice));
    if (!Number.isFinite(net) || net < 0 || !Number.isFinite(gross) || gross < 0) {
      return { success: false, error: "Los precios deben ser enteros mayores o iguales a 0." };
    }
  }

  const r = await ProductRequest.createVariant({
    productId,
    sku,
    barcode: input.barcode?.trim() || null,
    basePrice,
    unitId,
    stockBaseUnitId: input.stockBaseUnitId?.trim() || unitId,
    purchaseUnitId: input.purchaseUnitId?.trim() || unitId,
    stockBaseQtyPerCountSaleUnit: input.stockBaseQtyPerCountSaleUnit,
    stockBaseQtyPerCountPurchaseUnit: input.stockBaseQtyPerCountPurchaseUnit,
    isActive: input.isActive !== false,
    visibleInEShop: input.visibleInEShop === true,
    priceListItems: items,
    attributeValues: attributeValuesToSend,
    trackInventory: input.trackInventory,
    allowNegativeStock: input.allowNegativeStock,
    minimumStock: input.minimumStock,
    minimumStockEnabled: input.minimumStockEnabled,
    maximumStock: input.maximumStock,
    maximumStockEnabled: input.maximumStockEnabled,
    reorderPoint: input.reorderPoint,
    reorderPointEnabled: input.reorderPointEnabled,
    netWeightKg: input.netWeightKg,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function deleteProductVariantAction(variantId: string): Promise<DeleteProductVariantResult> {
  const trimmed = variantId?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Variante no válida" };
  }
  const r = await ProductRequest.removeVariant(trimmed);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}

export async function updateProductVariantAction(
  variantId: string,
  input: CreateProductVariantFormInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  const productId = input.productId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  const unitId = input.unitId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  if (!productId) {
    return { success: false, error: "Producto no válido" };
  }
  if (!sku) {
    return { success: false, error: "El SKU es obligatorio" };
  }
  if (!unitId) {
    return { success: false, error: "La unidad de medida es obligatoria" };
  }
  const items = input.priceListItems;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      error: "Debe indicar al menos un precio asociado a una lista de precios.",
    };
  }

  const basePrice = typeof input.basePrice === "number" && Number.isFinite(input.basePrice) ? input.basePrice : 0;
  if (basePrice < 0) {
    return { success: false, error: "El precio de referencia no puede ser negativo" };
  }

  let attributeValuesToSend: Record<string, string> | undefined;
  if (input.attributeValues != null && typeof input.attributeValues === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.attributeValues)) {
      const key = k.trim();
      if (!key) {
        continue;
      }
      const val = v == null ? "" : String(v).trim();
      if (val === "") {
        continue;
      }
      cleaned[key] = val;
    }
    if (Object.keys(cleaned).length > 0) {
      attributeValuesToSend = cleaned;
    }
  }

  const seen = new Set<string>();
  for (const it of items) {
    const lid = it.priceListId?.trim() ?? "";
    if (!lid) {
      return { success: false, error: "Cada precio por lista debe tener una lista de precios." };
    }
    if (seen.has(lid)) {
      return { success: false, error: "No puede repetir la misma lista de precios en más de una fila." };
    }
    seen.add(lid);
    const net = Math.round(Number(it.netPrice));
    const gross = Math.round(Number(it.grossPrice));
    if (!Number.isFinite(net) || net < 0 || !Number.isFinite(gross) || gross < 0) {
      return { success: false, error: "Los precios deben ser enteros mayores o iguales a 0." };
    }
  }

  const r = await ProductRequest.updateVariant(trimmedId, {
    productId,
    sku,
    barcode: input.barcode?.trim() || null,
    basePrice,
    unitId,
    stockBaseUnitId: input.stockBaseUnitId?.trim() || unitId,
    purchaseUnitId: input.purchaseUnitId?.trim() || unitId,
    stockBaseQtyPerCountSaleUnit: input.stockBaseQtyPerCountSaleUnit,
    stockBaseQtyPerCountPurchaseUnit: input.stockBaseQtyPerCountPurchaseUnit,
    isActive: input.isActive !== false,
    priceListItems: items,
    attributeValues: attributeValuesToSend,
    trackInventory: input.trackInventory,
    allowNegativeStock: input.allowNegativeStock,
    minimumStock: input.minimumStock,
    minimumStockEnabled: input.minimumStockEnabled,
    maximumStock: input.maximumStock,
    maximumStockEnabled: input.maximumStockEnabled,
    reorderPoint: input.reorderPoint,
    reorderPointEnabled: input.reorderPointEnabled,
    netWeightKg: input.netWeightKg,
    grossWeightKg: input.grossWeightKg,
    packageLengthCm: input.packageLengthCm,
    packageWidthCm: input.packageWidthCm,
    packageHeightCm: input.packageHeightCm,
    volumetricDivisorK: input.volumetricDivisorK,
  });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export type UpdateProductVariantLogisticsInput = {
  netWeightKg?: number | null;
  grossWeightKg?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  volumetricDivisorK?: number | null;
};

export async function updateProductVariantLogisticsAction(
  variantId: string,
  input: UpdateProductVariantLogisticsInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  const body: Record<string, unknown> = {
    netWeightKg: input.netWeightKg ?? null,
    grossWeightKg: input.grossWeightKg ?? null,
    packageLengthCm: input.packageLengthCm ?? null,
    packageWidthCm: input.packageWidthCm ?? null,
    packageHeightCm: input.packageHeightCm ?? null,
    volumetricDivisorK: input.volumetricDivisorK ?? null,
  };
  const r = await ProductRequest.patchVariantFields(trimmedId, body);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export type UpdateProductVariantFiscalPartialInput = {
  taxCategory: VariantTaxCategory;
  requiresDte: boolean;
  taxIds?: string[];
};

/** Actualiza tratamiento tributario SII vía `PUT product-variants/:id` parcial. */
export async function updateProductVariantFiscalPartialAction(
  variantId: string,
  input: UpdateProductVariantFiscalPartialInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  const body: Record<string, unknown> = {
    taxCategory: input.taxCategory,
    requiresDte: input.requiresDte,
  };
  if (Array.isArray(input.taxIds)) {
    body.taxIds = input.taxIds.map(String).filter(Boolean);
  }
  const r = await ProductRequest.patchVariantFields(trimmedId, body);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export type UpdateProductVariantIdentityPartialInput = {
  productId: string;
  sku: string;
  barcode: string | null;
  unitId: string;
  stockBaseUnitId: string;
  purchaseUnitId: string;
  stockBaseQtyPerCountSaleUnit?: number;
  stockBaseQtyPerCountPurchaseUnit?: number;
  attributeValues?: Record<string, string>;
  isActive: boolean;
};

/** Actualiza solo identidad / UDM / atributos vía `PUT product-variants/:id` parcial. */
export async function updateProductVariantIdentityPartialAction(
  variantId: string,
  input: UpdateProductVariantIdentityPartialInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  const productId = input.productId?.trim() ?? "";
  const sku = input.sku?.trim() ?? "";
  const unitId = input.unitId?.trim() ?? "";
  const stockBaseUnitId = input.stockBaseUnitId?.trim() ?? "";
  const purchaseUnitId = input.purchaseUnitId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  if (!productId) {
    return { success: false, error: "Producto no válido" };
  }
  if (!sku) {
    return { success: false, error: "El SKU es obligatorio" };
  }
  if (!unitId || !stockBaseUnitId || !purchaseUnitId) {
    return { success: false, error: "Las unidades de venta, stock y compra son obligatorias" };
  }

  let attributeValuesToSend: Record<string, string> | undefined;
  if (input.attributeValues != null && typeof input.attributeValues === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.attributeValues)) {
      const key = k.trim();
      if (!key) {
        continue;
      }
      const val = v == null ? "" : String(v).trim();
      if (val === "") {
        continue;
      }
      cleaned[key] = val;
    }
    if (Object.keys(cleaned).length > 0) {
      attributeValuesToSend = cleaned;
    }
  }

  const body: Record<string, unknown> = {
    productId,
    sku,
    barcode: input.barcode?.trim() ? input.barcode.trim() : null,
    unitId,
    saleUnitId: unitId,
    stockBaseUnitId,
    purchaseUnitId,
    isActive: input.isActive !== false,
  };
  if (input.stockBaseQtyPerCountSaleUnit != null) {
    body.stockBaseQtyPerCountSaleUnit = input.stockBaseQtyPerCountSaleUnit;
  }
  if (input.stockBaseQtyPerCountPurchaseUnit != null) {
    body.stockBaseQtyPerCountPurchaseUnit = input.stockBaseQtyPerCountPurchaseUnit;
  }
  if (attributeValuesToSend != null) {
    body.attributeValues = attributeValuesToSend;
  }

  const r = await ProductRequest.patchVariantFields(trimmedId, body);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export type UpdateProductVariantPricingPartialInput = {
  productId: string;
  basePrice: number;
  priceListItems: CreateProductVariantPriceListItemInput[];
};

/** Actualiza precios por lista y precio de referencia vía `PUT` parcial (PMP solo vía compras). */
export async function updateProductVariantPricingPartialAction(
  variantId: string,
  input: UpdateProductVariantPricingPartialInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  const productId = input.productId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  if (!productId) {
    return { success: false, error: "Producto no válido" };
  }
  const items = input.priceListItems;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      error: "Debe indicar al menos un precio asociado a una lista de precios.",
    };
  }
  const basePrice = typeof input.basePrice === "number" && Number.isFinite(input.basePrice) ? input.basePrice : 0;
  if (basePrice < 0) {
    return { success: false, error: "El precio de referencia no puede ser negativo" };
  }
  const seen = new Set<string>();
  for (const it of items) {
    const lid = it.priceListId?.trim() ?? "";
    if (!lid) {
      return { success: false, error: "Cada precio por lista debe tener una lista de precios." };
    }
    if (seen.has(lid)) {
      return { success: false, error: "No puede repetir la misma lista de precios en más de una fila." };
    }
    seen.add(lid);
    const net = Math.round(Number(it.netPrice));
    const gross = Math.round(Number(it.grossPrice));
    if (!Number.isFinite(net) || net < 0 || !Number.isFinite(gross) || gross < 0) {
      return { success: false, error: "Los precios deben ser enteros mayores o iguales a 0." };
    }
  }

  const body: Record<string, unknown> = {
    productId,
    basePrice,
    priceListItems: items.map((item) => ({
      priceListId: item.priceListId.trim(),
      netPrice: Math.round(Number(item.netPrice)) || 0,
      grossPrice: Math.round(Number(item.grossPrice)) || 0,
      taxIds: Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
    })),
  };

  const r = await ProductRequest.patchVariantFields(trimmedId, body);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export type UpdateProductVariantInventoryPartialInput = {
  trackInventory: boolean;
  allowNegativeStock: boolean;
  minimumStock: number;
  minimumStockEnabled: boolean;
  maximumStock: number;
  maximumStockEnabled: boolean;
  reorderPoint: number;
  reorderPointEnabled: boolean;
};

/** Actualiza flags y umbrales de inventario vía `PUT` parcial. */
export async function updateProductVariantInventoryPartialAction(
  variantId: string,
  input: UpdateProductVariantInventoryPartialInput,
): Promise<UpdateProductVariantResult> {
  const trimmedId = variantId?.trim() ?? "";
  if (!trimmedId) {
    return { success: false, error: "Variante no válida" };
  }
  const body: Record<string, unknown> = {
    trackInventory: input.trackInventory,
    allowNegativeStock: input.allowNegativeStock,
    minimumStock: Math.max(0, Math.round(Number(input.minimumStock) || 0)),
    minimumStockEnabled: Boolean(input.minimumStockEnabled),
    maximumStock: Math.max(0, Math.round(Number(input.maximumStock) || 0)),
    maximumStockEnabled: Boolean(input.maximumStockEnabled),
    reorderPoint: Math.max(0, Math.round(Number(input.reorderPoint) || 0)),
    reorderPointEnabled: Boolean(input.reorderPointEnabled),
  };

  const r = await ProductRequest.patchVariantFields(trimmedId, body);
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
    revalidatePath(`${PRODUCT_VARIANT_DETAIL_PATH_PREFIX}/${encodeURIComponent(trimmedId)}`, "page");
  }
  return r;
}

export async function getProductVariantDetailForPage(variantId: string) {
  return ProductRequest.fetchVariantById(variantId);
}

export type ListVariantSalePriceHistoryResult =
  | { success: true; items: import("../types/variant-sale-price-history.types").VariantSalePriceHistoryEntry[] }
  | { success: false; error: string };

export async function listVariantSalePriceHistoryAction(
  variantId: string,
  opts?: { priceListId?: string; limit?: number },
): Promise<ListVariantSalePriceHistoryResult> {
  const r = await ProductRequest.getVariantSalePriceHistory(variantId, opts);
  if (!r.success) {
    return r;
  }
  return { success: true, items: r.data.items };
}
