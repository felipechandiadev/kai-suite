import type { Metadata } from "next";
import type { EShopCatalogProductDetail } from "../types/storefront.types";
import { buildProductDetailCanonicalUrl } from "@/lib/eshop-site-url";
import { resolveMultimediaPublicUrl } from "@/lib/resolve-multimedia-public-url";
import { buildProductDetailGallery } from "./product-detail-gallery";
import { resolveInitialVariant } from "./variant-selection";

const MAX_OG_DESCRIPTION = 160;

function truncateDescription(text: string): string {
  if (text.length <= MAX_OG_DESCRIPTION) {
    return text;
  }
  return `${text.slice(0, MAX_OG_DESCRIPTION - 1).trim()}…`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function normalizeOgImageUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }
  return resolveMultimediaPublicUrl(url.trim()) ?? url.trim();
}

/** Título OG: nombre del producto + atributos de variante no repetidos en el nombre. */
export function buildProductOgTitle(
  productName: string,
  variant: { attributeValues: Record<string, string> } | null,
): string {
  const base = productName.trim() || "Producto";
  if (!variant) {
    return base;
  }

  const attrParts = Object.values(variant.attributeValues)
    .map((value) => value.trim())
    .filter(Boolean);
  if (attrParts.length === 0) {
    return base;
  }

  const baseLower = base.toLowerCase();
  const extra = attrParts.filter((part) => !baseLower.includes(part.toLowerCase()));
  if (extra.length === 0) {
    return base;
  }

  return `${base} ${extra.join(" ")}`.trim();
}

/** Descripción OG: descripción del catálogo o plantilla por defecto. */
export function buildProductOgDescription(
  productName: string,
  productDescription: string | null | undefined,
): string {
  const fromCatalog = productDescription?.trim();
  if (fromCatalog) {
    return truncateDescription(fromCatalog);
  }

  const name = productName.trim() || "este producto";
  return truncateDescription(`Descubre la elegancia de nuestro ${name}.`);
}

function pickOgImageUrl(detail: EShopCatalogProductDetail, variantId?: string | null): string | undefined {
  const variant = resolveInitialVariant(
    detail.variants,
    variantId,
    detail.defaultVariantId,
  );

  const variantImage =
    variant?.multimedia.find((m) => m.isPrimary && isImageMime(m.mimeType)) ??
    variant?.multimedia.find((m) => isImageMime(m.mimeType));

  if (variantImage?.publicUrl?.trim()) {
    return normalizeOgImageUrl(variantImage.publicUrl.trim());
  }

  const { gallery } = buildProductDetailGallery(detail.product.multimedia, detail.variants);
  const fromGallery = gallery.find((m) => isImageMime(m.mimeType));
  if (fromGallery?.publicUrl?.trim()) {
    return normalizeOgImageUrl(fromGallery.publicUrl.trim());
  }

  return undefined;
}

export type ProductDetailSeo = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
};

export function buildProductDetailSeo(
  detail: EShopCatalogProductDetail,
  variantId?: string | null,
): ProductDetailSeo {
  const variant = resolveInitialVariant(
    detail.variants,
    variantId,
    detail.defaultVariantId,
  );
  const productName = detail.product.name.trim() || "Producto";
  const title = buildProductOgTitle(productName, variant);
  const description = buildProductOgDescription(productName, detail.product.description);
  const canonicalUrl = buildProductDetailCanonicalUrl(detail.product.id, variant?.id ?? variantId);
  const imageUrl = pickOgImageUrl(detail, variantId);

  return { title, description, canonicalUrl, imageUrl };
}

export function productDetailMetadata(seo: ProductDetailSeo): Metadata {
  const images = seo.imageUrl
    ? [
        {
          url: seo.imageUrl,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ]
    : undefined;

  const siteName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "KaiStore eShop";

  const other: Record<string, string> = {
    "og:type": "product",
    "og:title": seo.title,
    "og:description": seo.description,
    "og:url": seo.canonicalUrl,
  };
  if (seo.imageUrl) {
    other["og:image"] = seo.imageUrl;
    if (seo.imageUrl.startsWith("https://")) {
      other["og:image:secure_url"] = seo.imageUrl;
    }
  }

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalUrl,
    },
    openGraph: {
      url: seo.canonicalUrl,
      title: seo.title,
      description: seo.description,
      siteName,
      locale: "es_CL",
      images,
    },
    twitter: {
      card: seo.imageUrl ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      images: seo.imageUrl ? [seo.imageUrl] : undefined,
    },
    other,
  };
}
