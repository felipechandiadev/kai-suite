import { coreFetch } from "@/lib/http";

/** Variante anidada en fila de producto (catálogo expandible, estilo Suite). */
export type LiteProductVariantRow = {
  variantId: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  isActive: boolean;
  attributeValues?: Record<string, string> | null;
  attributesLabel?: string | null;
  physicalStock?: number;
};

/** 1 fila = 1 producto; variantes en `variants` (panel expand). */
export type LiteProductRow = {
  id: string;
  productId: string;
  name: string;
  productType: string;
  isActive: boolean;
  variantCount: number;
  variants: LiteProductVariantRow[];
};

export type LiteSiblingVariant = {
  variantId: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  isActive: boolean;
  attributeValues?: Record<string, string> | null;
  attributesLabel?: string | null;
};

/** Variante aplanada para selectores (pack, reportes, etc.). */
export type LiteFlatVariantOption = LiteProductVariantRow & {
  name: string;
  productType: string;
};

export function flattenLiteProductVariants(
  products: LiteProductRow[],
): LiteFlatVariantOption[] {
  const out: LiteFlatVariantOption[] = [];
  for (const p of products) {
    for (const v of p.variants ?? []) {
      out.push({
        ...v,
        name: p.name,
        productType: p.productType,
      });
    }
  }
  return out;
}

/** Nivel plano por variante×almacén (respuesta GET /lite/stock). */
export type LiteStockRow = {
  variantId: string;
  sku: string;
  name: string;
  physicalStock: number;
  storageId: string;
  storageName: string;
};

/** Fila de grilla Existencias: 1 variante con breakdown por almacén. */
export type LiteStockVariantRow = {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  totalPhysical: number;
  byStorage: Array<{
    storageId: string;
    storageName: string;
    physicalStock: number;
  }>;
};

export type LiteUnitRow = {
  id: string;
  name: string;
  symbol: string;
  dimension: string;
  conversionFactor: number;
  isBase?: boolean;
};

export type LiteStorageRow = {
  id: string;
  name: string;
  type?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export type LiteCategoryRow = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  productCount?: number;
  childCount?: number;
};

export type LiteAttributeRow = {
  id: string;
  name: string;
  description?: string | null;
  options: string[];
  displayOrder?: number;
  isActive: boolean;
};

export type LiteSalePayment = {
  method: string;
  amount: number;
  reference?: string;
};

export type LiteSaleRow = {
  id: string;
  createdAt: string;
  documentNumber?: string;
  status?: string;
  method: string;
  userId?: string | null;
  userName?: string | null;
  total: number;
  payments?: LiteSalePayment[];
  lines?: Array<{ variantId: string; qty: number; unitPrice: number; name?: string }>;
};

export type LitePosCurrent = {
  id: string;
  name: string;
  storageId?: string | null;
  branchId?: string | null;
  isActive?: boolean;
  enabledPaymentMethods?: string[];
  availablePaymentMethods?: string[];
};

export type LiteVariantDetail = {
  variantId: string;
  productId: string;
  name: string;
  productType: string;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  baseCost?: number;
  isActive: boolean;
  physicalStock?: number;
  attributeValues?: Record<string, string> | null;
  attributesLabel?: string | null;
};

export type LitePackLine = {
  componentVariantId: string;
  qty: number;
  name?: string;
  sku?: string;
};

export const liteAdminApi = {
  products: () => coreFetch<{ items: LiteProductRow[] }>("/lite/products"),
  createProduct: (body: {
    name: string;
    productType: string;
    sku?: string;
    barcode?: string;
    basePrice?: number;
    unitId?: string;
    categoryId?: string;
    isActive?: boolean;
  }) =>
    coreFetch<{ productId: string; variantId: string }>("/lite/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  bulkCreateProducts: (
    lines: Array<{
      name: string;
      sku: string;
      barcode?: string;
      productType?: string;
      basePrice?: number;
      categoryName?: string;
      isActive?: boolean;
    }>,
  ) =>
    coreFetch<{
      items: Array<{
        sku: string;
        name: string;
        ok: boolean;
        message: string;
        productId?: string;
        variantId?: string;
      }>;
    }>("/lite/products/bulk", {
      method: "POST",
      body: JSON.stringify({ lines }),
    }),
  patchProduct: (productId: string, body: Record<string, unknown>) =>
    coreFetch(`/lite/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  productVariants: (productId: string) =>
    coreFetch<{
      productId: string;
      productName: string;
      productType: string;
      items: LiteSiblingVariant[];
    }>(`/lite/products/${productId}/variants`),
  createVariant: (
    productId: string,
    body: {
      sku?: string;
      barcode?: string;
      basePrice?: number;
      attributeValues?: Record<string, string>;
      isActive?: boolean;
    },
  ) =>
    coreFetch<LiteVariantDetail>(`/lite/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchVariant: (variantId: string, body: Record<string, unknown>) =>
    coreFetch<LiteVariantDetail>(`/lite/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  variantDetail: (variantId: string) =>
    coreFetch<LiteVariantDetail>(`/lite/variants/${variantId}`),
  getPack: (variantId: string) =>
    coreFetch<{ lines: LitePackLine[] }>(`/lite/variants/${variantId}/pack`),
  putPack: (variantId: string, lines: LitePackLine[]) =>
    coreFetch(`/lite/variants/${variantId}/pack`, {
      method: "PUT",
      body: JSON.stringify({
        lines: lines.map((l) => ({
          componentVariantId: l.componentVariantId,
          qty: l.qty,
        })),
      }),
    }),
  stock: () => coreFetch<{ items: LiteStockRow[] }>("/lite/stock"),
  adjustStock: (body: {
    variantId: string;
    storageId?: string;
    targetQty: number;
    note?: string;
  }) =>
    coreFetch("/lite/stock/adjust", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deltaStock: (body: {
    variantId: string;
    storageId: string;
    delta: number;
    note?: string;
  }) =>
    coreFetch("/lite/stock/delta", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transferStock: (body: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }) =>
    coreFetch("/lite/stock/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  units: () => coreFetch<{ items: LiteUnitRow[] }>("/lite/units"),
  createUnit: (body: Partial<LiteUnitRow> & { name: string; symbol: string }) =>
    coreFetch("/lite/units", { method: "POST", body: JSON.stringify(body) }),
  patchUnit: (id: string, body: Partial<LiteUnitRow>) =>
    coreFetch(`/lite/units/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  storages: () => coreFetch<{ items: LiteStorageRow[] }>("/lite/storages"),
  createStorage: (body: { name: string; isDefault?: boolean }) =>
    coreFetch("/lite/storages", { method: "POST", body: JSON.stringify(body) }),
  patchStorage: (id: string, body: Partial<LiteStorageRow>) =>
    coreFetch(`/lite/storages/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  categories: () => coreFetch<{ items: LiteCategoryRow[] }>("/lite/categories"),
  createCategory: (body: { name: string; description?: string; parentId?: string }) =>
    coreFetch("/lite/categories", { method: "POST", body: JSON.stringify(body) }),
  patchCategory: (id: string, body: Partial<LiteCategoryRow>) =>
    coreFetch(`/lite/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCategory: (id: string) =>
    coreFetch(`/lite/categories/${id}`, { method: "DELETE" }),
  attributes: () => coreFetch<{ items: LiteAttributeRow[] }>("/lite/attributes"),
  createAttribute: (body: { name: string; description?: string; options?: string[] }) =>
    coreFetch("/lite/attributes", { method: "POST", body: JSON.stringify(body) }),
  patchAttribute: (id: string, body: Partial<LiteAttributeRow>) =>
    coreFetch(`/lite/attributes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAttribute: (id: string) =>
    coreFetch(`/lite/attributes/${id}`, { method: "DELETE" }),
  sales: () => coreFetch<{ items: LiteSaleRow[] }>("/lite/sales"),
  sale: (id: string) => coreFetch<LiteSaleRow>(`/lite/sales/${id}`),
  voidSale: (id: string, body?: { reason?: string }) =>
    coreFetch<LiteSaleRow>(`/lite/sales/${id}/void`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  posCurrent: () => coreFetch<LitePosCurrent>("/lite/points-of-sale/current"),
  patchPosCurrent: (body: Partial<LitePosCurrent>) =>
    coreFetch("/lite/points-of-sale/current", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  patchCompany: (body: {
    razonSocial?: string;
    nombreFantasia?: string;
    rut?: string;
    businessActivity?: string | null;
    address?: string | null;
    commune?: string | null;
    city?: string | null;
    phone?: string | null;
    mail?: string | null;
  }) =>
    coreFetch("/lite/company", { method: "PATCH", body: JSON.stringify(body) }),
};
