"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { resolveMultimediaPublicUrl } from "@/lib/resolve-multimedia-public-url";
import { EShopRequest } from "../infrastructure/eshop.request";
import type {
  EShopBranch,
  EShopCatalogProductDetail,
  EShopHeroSlide,
  EShopProductCard,
  EShopStorefront,
  EShopTestimonial,
} from "../types/storefront.types";

export async function getStorefrontAction(): Promise<EShopStorefront> {
  const data = await EShopRequest.get<EShopStorefront>(getEShopStoreSlug(), "/e-shop/storefront");
  return {
    ...data,
    companyLogoUrl: resolveMultimediaPublicUrl(data.companyLogoUrl),
  };
}

function mapProductCard(p: EShopProductCard): EShopProductCard {
  return {
    ...p,
    imageUrl: resolveMultimediaPublicUrl(p.imageUrl),
  };
}

export async function getFeaturedProductsAction() {
  const data = await EShopRequest.get<{ items: EShopProductCard[] }>(
    getEShopStoreSlug(),
    "/e-shop/products/featured",
  );
  return { items: data.items.map(mapProductCard) };
}

export async function getProductsAction(opts?: { page?: number; search?: string }) {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.search) params.set("search", opts.search);
  const qs = params.toString();
  const data = await EShopRequest.get<{ items: EShopProductCard[]; total: number }>(
    getEShopStoreSlug(),
    `/e-shop/products${qs ? `?${qs}` : ""}`,
  );
  return { ...data, items: data.items.map(mapProductCard) };
}

function mapCatalogMultimedia<T extends { publicUrl: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    publicUrl: resolveMultimediaPublicUrl(item.publicUrl) ?? item.publicUrl,
  }));
}

function mapCatalogProductDetail(detail: EShopCatalogProductDetail): EShopCatalogProductDetail {
  return {
    ...detail,
    product: {
      ...detail.product,
      multimedia: mapCatalogMultimedia(detail.product.multimedia),
    },
    variants: detail.variants.map((variant) => ({
      ...variant,
      multimedia: mapCatalogMultimedia(variant.multimedia),
    })),
  };
}

export async function getCatalogProductAction(productId: string) {
  const detail = await EShopRequest.get<EShopCatalogProductDetail>(
    getEShopStoreSlug(),
    `/e-shop/catalog-products/${productId}`,
  );
  return mapCatalogProductDetail(detail);
}

export async function getProductAction(id: string) {
  const product = await EShopRequest.get<Record<string, unknown>>(
    getEShopStoreSlug(),
    `/e-shop/products/${id}`,
  );
  const multimedia = Array.isArray(product.multimedia)
    ? product.multimedia.map((m) => {
        const row = m as { publicUrl?: string };
        return {
          ...row,
          publicUrl: resolveMultimediaPublicUrl(row.publicUrl ?? null) ?? row.publicUrl,
        };
      })
    : product.multimedia;
  return { ...product, multimedia };
}

export async function getHeroSlidesAction() {
  const data = await EShopRequest.get<{
    slides: EShopHeroSlide[];
    autoplaySeconds: number;
  }>(getEShopStoreSlug(), "/e-shop/hero-slides");
  return {
    slides: data.slides.map((s) => ({
      ...s,
      imageUrl: resolveMultimediaPublicUrl(s.imageUrl),
    })),
    autoplaySeconds: data.autoplaySeconds,
  };
}

export async function getTestimonialsAction() {
  const rows = await EShopRequest.get<EShopTestimonial[]>(
    getEShopStoreSlug(),
    "/e-shop/testimonials",
  );
  return rows.map((t) => ({
    ...t,
    avatarUrl: resolveMultimediaPublicUrl(t.avatarUrl),
  }));
}

export async function getBranchesAction() {
  return EShopRequest.get<EShopBranch[]>(getEShopStoreSlug(), "/e-shop/branches");
}
