"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import type {
  EShopCatalogMultimediaItem,
  EShopCatalogProductDetail,
} from "@/features/e-shop-storefront/types/storefront.types";
import { buildProductDetailGallery } from "@/features/e-shop-storefront/utils/product-detail-gallery";
import {
  findVariantByExactSelection,
  isOptionAvailable,
  resolveInitialVariant,
  selectionAfterOptionPick,
} from "@/features/e-shop-storefront/utils/variant-selection";
import {
  buildProductDetailCanonicalUrl,
  buildProductDetailPath,
} from "@/lib/eshop-site-url";
import { EShopProductDetailToolbar } from "@/shared/components/EShopProductDetailToolbar";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function isVideoAsset(asset: EShopCatalogMultimediaItem): boolean {
  return asset.kind === "video" || asset.mimeType.startsWith("video/");
}

function productPrimaryImageUrl(
  productMedia: EShopCatalogMultimediaItem[],
): string | null {
  return (
    productMedia.find((m) => m.isPrimary === true)?.publicUrl ??
    productMedia[0]?.publicUrl ??
    null
  );
}

type Props = {
  detail: EShopCatalogProductDetail;
  initialVariantId?: string | null;
  preview?: boolean;
};

export function EShopProductDetailView({
  detail,
  initialVariantId,
  preview = false,
}: Props) {
  const router = useRouter();
  const { addItem } = useEShopCart();
  const attributeDimensions = useMemo(
    () => Object.keys(detail.attributeOptions),
    [detail.attributeOptions],
  );
  const hasSelectors = attributeDimensions.length > 0 && detail.variants.length > 1;

  const defaultVariant = useMemo(
    () => resolveInitialVariant(detail.variants, initialVariantId, detail.defaultVariantId),
    [detail.defaultVariantId, detail.variants, initialVariantId],
  );

  const [selection, setSelection] = useState<Record<string, string>>(
    () => defaultVariant?.attributeValues ?? {},
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const selectedVariant = useMemo(() => {
    if (!hasSelectors) {
      return defaultVariant;
    }
    return (
      findVariantByExactSelection(detail.variants, selection, attributeDimensions) ??
      defaultVariant
    );
  }, [attributeDimensions, defaultVariant, detail.variants, hasSelectors, selection]);

  const selectionComplete = attributeDimensions.every((d) => Boolean(selection[d]?.trim()));
  const selectionResolved =
    !hasSelectors ||
    findVariantByExactSelection(detail.variants, selection, attributeDimensions) != null;

  const { gallery, primaryIndex } = useMemo(
    () => buildProductDetailGallery(detail.product.multimedia, detail.variants),
    [detail.product.multimedia, detail.variants],
  );

  useEffect(() => {
    setSelection(defaultVariant?.attributeValues ?? {});
    setActiveImageIndex(primaryIndex);
  }, [defaultVariant, detail.product.id, primaryIndex]);

  const activeImage = gallery[activeImageIndex] ?? gallery[0] ?? null;

  const selectOption = useCallback(
    (dimension: string, value: string) => {
      setSelection((prev) =>
        selectionAfterOptionPick(
          detail.variants,
          dimension,
          value,
          prev,
          attributeDimensions,
        ),
      );
    },
    [attributeDimensions, detail.variants],
  );

  const inStock = selectedVariant?.inStock === true;
  const price = selectedVariant?.basePrice ?? defaultVariant?.basePrice ?? 0;

  const shareUrl = useMemo(
    () => buildProductDetailCanonicalUrl(detail.product.id, selectedVariant?.id ?? null),
    [detail.product.id, selectedVariant?.id],
  );

  useEffect(() => {
    if (preview || typeof window === "undefined") {
      return;
    }
    const variantId = selectedVariant?.id?.trim();
    if (!variantId) {
      return;
    }
    const nextPath = buildProductDetailPath(detail.product.id, variantId);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== nextPath) {
      router.replace(nextPath, { scroll: false });
    }
  }, [detail.product.id, preview, router, selectedVariant?.id]);

  return (
    <div className="space-y-0">
      <EShopProductDetailToolbar shareUrl={shareUrl} preview={preview} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border bg-muted aspect-square">
          {activeImage ? (
            isVideoAsset(activeImage) ? (
              <video
                src={activeImage.publicUrl}
                className="h-full w-full object-cover"
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage.publicUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                  index === activeImageIndex ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                onClick={() => setActiveImageIndex(index)}
                aria-label={`Imagen ${index + 1}`}
              >
                {isVideoAsset(asset) ? (
                  <video src={asset.publicUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.publicUrl} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {preview ? (
          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
            Vista previa eShop
          </span>
        ) : null}
        {detail.product.brand ? (
          <p className="text-sm text-muted-foreground">{detail.product.brand}</p>
        ) : null}
        <h1 className="text-2xl font-semibold leading-tight">{detail.product.name}</h1>
        {detail.product.categoryName ? (
          <p className="text-xs text-muted-foreground">{detail.product.categoryName}</p>
        ) : null}
        <p className="text-2xl font-bold">{fmt(price)}</p>
        <p className={`text-sm ${inStock ? "text-emerald-700" : "text-destructive"}`}>
          {inStock ? "Disponible" : "Agotado"}
        </p>

        {selectedVariant?.sku ? (
          <p className="font-mono text-sm text-foreground">
            SKU: {selectedVariant.sku}
          </p>
        ) : null}

        {hasSelectors ? (
          <div className="space-y-4 border-t border-border pt-4">
            {attributeDimensions.map((dimension) => (
              <div key={dimension} className="space-y-2">
                <p className="text-sm font-medium">{dimension}</p>
                <div className="flex flex-wrap gap-2">
                  {(detail.attributeOptions[dimension] ?? []).map((value) => {
                    const available = isOptionAvailable(
                      detail.variants,
                      dimension,
                      value,
                      selection,
                    );
                    const selected = selection[dimension] === value;
                    return (
                      <button
                        key={`${dimension}-${value}`}
                        type="button"
                        disabled={!available}
                        onClick={() => selectOption(dimension, value)}
                        className={`min-h-9 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? "border-2 border-primary"
                            : available
                              ? "border border-border hover:border-primary/40"
                              : "cursor-not-allowed border border-border/60 text-muted-foreground opacity-50"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {selectionComplete && !selectionResolved ? (
              <p className="text-xs text-destructive">Esta combinación de atributos no está disponible.</p>
            ) : null}
          </div>
        ) : null}

        <Button
          variant="primary"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={preview || !selectedVariant || !inStock}
          onClick={() => {
            if (!selectedVariant || preview) {
              return;
            }
            const imageUrl = productPrimaryImageUrl(detail.product.multimedia);
            addItem({
              productVariantId: selectedVariant.id,
              unitPrice: selectedVariant.basePrice,
              name: detail.product.name,
              imageUrl,
            });
          }}
        >
          {preview ? "Vista previa" : inStock ? "Agregar al carrito" : "Agotado"}
        </Button>

        {detail.product.description ? (
          <section className="space-y-2 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Descripción</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {detail.product.description}
            </p>
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}
