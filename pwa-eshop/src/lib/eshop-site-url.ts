/**
 * Origen público de la tienda (HTML + og:url). Configurar en producción:
 * NEXT_PUBLIC_ESHOP_SITE_URL=https://tu-dominio.cl
 */
export function getEshopSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ESHOP_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:5064";
}

export function buildProductDetailPath(productId: string, variantId?: string | null): string {
  const id = productId.trim();
  const base = `/productos/p/${encodeURIComponent(id)}`;
  const variant = variantId?.trim();
  if (!variant) {
    return base;
  }
  return `${base}?variant=${encodeURIComponent(variant)}`;
}

export function buildProductDetailCanonicalUrl(
  productId: string,
  variantId?: string | null,
): string {
  return `${getEshopSiteOrigin()}${buildProductDetailPath(productId, variantId)}`;
}
