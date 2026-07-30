/**
 * Una tienda por deploy: el slug se resuelve contra `settings.eShopPublicSlug` vía header API.
 * No va en la URL pública.
 */
export function getEShopStoreSlug(): string {
  const slug =
    process.env.ESHOP_STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_ESHOP_STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_ESHOP_SLUG?.trim() ||
    "";

  if (!slug) {
    throw new Error(
      "Configure NEXT_PUBLIC_ESHOP_STORE_SLUG en .env.local (debe coincidir con el slug público en admin → Empresa).",
    );
  }

  return slug;
}
