import type { EShopCatalogProductVariant } from "./types/catalog-product.types";

export function formatEShopStockLabel(
  variant: Pick<EShopCatalogProductVariant, "trackInventory" | "availableStock" | "inStock"> | null | undefined,
  storageName?: string | null,
): { text: string; inStock: boolean } {
  if (!variant) {
    return { text: "—", inStock: false };
  }

  const storageHint = storageName?.trim()
    ? ` en ${storageName.trim()}`
    : "";

  if (variant.trackInventory !== true) {
    return { text: "Disponible (sin control de stock)", inStock: true };
  }

  const qty = variant.availableStock ?? 0;
  if (qty <= 0) {
    return { text: `Agotado${storageHint}`, inStock: false };
  }

  const units = qty === 1 ? "1 unidad disponible" : `${qty} unidades disponibles`;
  return { text: `${units}${storageHint}`, inStock: true };
}
