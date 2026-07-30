export const SCAN_PATH = "/scan";
export const SEARCH_PATH = "/search";

export function variantDetailPath(variantId: string): string {
  return `/variant/${encodeURIComponent(variantId.trim())}`;
}

export function variantBarcodePath(variantId: string): string {
  return `${variantDetailPath(variantId)}/barcode`;
}

/** Detalle de variante o subrutas (`/variant/[id]/barcode`, etc.). */
export function isVariantDetailPath(pathname: string): boolean {
  return pathname === "/variant" || pathname.startsWith("/variant/");
}

/** Rutas a revalidar tras mutaciones de inventario/variante */
export const VARIANT_REVALIDATE_PATHS = [
  SCAN_PATH,
  SEARCH_PATH,
  "/variant",
  "/product/create",
] as const;
