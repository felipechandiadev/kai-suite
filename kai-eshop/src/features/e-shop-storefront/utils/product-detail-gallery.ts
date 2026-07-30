import type { EShopCatalogMultimediaItem } from "../types/storefront.types";

/** Galería PDP: principal del producto primero, luego resto producto + todas las variantes (sin duplicados). */
export function buildProductDetailGallery(
  productMedia: EShopCatalogMultimediaItem[],
  variants: Array<{ multimedia: EShopCatalogMultimediaItem[] }>,
): { gallery: EShopCatalogMultimediaItem[]; primaryIndex: number } {
  const seen = new Set<string>();
  const gallery: EShopCatalogMultimediaItem[] = [];

  const push = (item: EShopCatalogMultimediaItem) => {
    if (seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    gallery.push(item);
  };

  const primaryProduct =
    productMedia.find((m) => m.isPrimary === true) ?? productMedia[0] ?? null;

  if (primaryProduct) {
    push(primaryProduct);
  }
  for (const item of productMedia) {
    if (item.id !== primaryProduct?.id) {
      push(item);
    }
  }
  for (const variant of variants) {
    for (const item of variant.multimedia) {
      push(item);
    }
  }

  const primaryIndex =
    primaryProduct != null ? gallery.findIndex((g) => g.id === primaryProduct.id) : 0;

  return { gallery, primaryIndex: Math.max(0, primaryIndex) };
}
