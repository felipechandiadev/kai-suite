import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import type {
  EShopCatalogProductDetail,
  EShopCatalogProductVariant,
} from "./types/catalog-product.types";

function resolveVariantAttributeLabels(
  raw: Record<string, string> | undefined,
  attributeNameById: Map<string, string>,
): Record<string, string> {
  if (!raw) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = value != null ? String(value).trim() : "";
    if (!trimmed) {
      continue;
    }
    const label = attributeNameById.get(key) ?? key;
    out[label] = trimmed;
  }
  return out;
}

function buildAttributeOptions(
  variants: Array<{ attributeValues: Record<string, string> }>,
): Record<string, string[]> {
  const order = new Map<string, string[]>();
  const seen = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const [dimension, value] of Object.entries(variant.attributeValues)) {
      if (!seen.has(dimension)) {
        seen.set(dimension, new Set());
        order.set(dimension, []);
      }
      const bucket = seen.get(dimension)!;
      if (!bucket.has(value)) {
        bucket.add(value);
        order.get(dimension)!.push(value);
      }
    }
  }

  return Object.fromEntries(order.entries());
}

function pickDefaultVariantId(variants: EShopCatalogProductVariant[]): string | null {
  if (!variants.length) {
    return null;
  }
  const inStock = variants.find((v) => v.inStock);
  return inStock?.id ?? variants[0].id;
}

function variantPrice(row: ProductGridRow["variants"][number]): number {
  const fromList = row.priceListItems?.find((p) => Number.isFinite(p.grossPrice) && p.grossPrice > 0);
  if (fromList) {
    return fromList.grossPrice;
  }
  if (typeof row.basePrice === "number" && Number.isFinite(row.basePrice)) {
    return row.basePrice;
  }
  return 0;
}

function normalizeAttributeValues(raw: Record<string, string> | undefined): Record<string, string> {
  if (!raw) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = value != null ? String(value).trim() : "";
    if (trimmed) {
      out[key] = trimmed;
    }
  }
  return out;
}

export function mapProductGridRowToCatalogDetail(
  row: ProductGridRow,
  attributeNameById?: Map<string, string>,
): EShopCatalogProductDetail | null {
  const eshopVariants = (row.variants ?? []).filter(
    (v) => v.visibleInEShop === true && v.isActive !== false,
  );

  if (eshopVariants.length === 0) {
    return null;
  }

  const variants: EShopCatalogProductVariant[] = eshopVariants.map((v) => ({
    id: v.id,
    sku: v.sku,
    attributeValues: attributeNameById
      ? resolveVariantAttributeLabels(normalizeAttributeValues(v.attributeValues), attributeNameById)
      : normalizeAttributeValues(v.attributeValues),
    basePrice: variantPrice(v),
    inStock: v.trackInventory !== true,
    availableStock: null,
    trackInventory: v.trackInventory === true,
    multimedia: (v.mediaAssets ?? []).map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    })),
  }));

  const productMultimedia = (row.mediaAssets ?? []).map((asset) => ({
    id: asset.id,
    publicUrl: asset.publicUrl,
    mimeType: asset.mimeType,
    kind: asset.kind,
  }));

  return {
    product: {
      id: row.id,
      name: row.name,
      brand: row.brand,
      categoryName: row.categoryName,
      description: row.description,
      productType: String(row.productType ?? "PHYSICAL"),
      multimedia: productMultimedia,
    },
    variants,
    attributeOptions: buildAttributeOptions(variants),
    defaultVariantId: pickDefaultVariantId(variants),
  };
}
