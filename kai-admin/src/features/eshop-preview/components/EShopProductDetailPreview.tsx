"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EShopCatalogMultimediaItem,
  EShopCatalogProductDetail,
} from "../types/catalog-product.types";
import { buildProductDetailGallery } from "../product-detail-gallery";
import {
  findVariantByExactSelection,
  isOptionAvailable,
  resolveInitialVariant,
  selectionAfterOptionPick,
} from "../variant-selection";
import { formatEShopStockLabel } from "../format-stock-label";

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

function hasAttributeSelectors(detail: EShopCatalogProductDetail): boolean {
  if (detail.variants.length <= 1) {
    return false;
  }
  return Object.values(detail.attributeOptions).some((values) => values.length > 0);
}

type Props = {
  detail: EShopCatalogProductDetail;
};

export function EShopProductDetailPreview({ detail }: Props) {
  const attributeDimensions = useMemo(
    () => Object.keys(detail.attributeOptions),
    [detail.attributeOptions],
  );
  const hasSelectors = hasAttributeSelectors(detail);

  const defaultVariant = useMemo(
    () => resolveInitialVariant(detail.variants, null, detail.defaultVariantId),
    [detail.defaultVariantId, detail.variants],
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

  const price = selectedVariant?.basePrice ?? defaultVariant?.basePrice ?? 0;
  const stock = formatEShopStockLabel(selectedVariant, detail.previewStorageName);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
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
              <img src={activeImage.publicUrl} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
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

      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
          Vista previa eShop
        </span>
        {detail.product.brand ? (
          <p className="text-sm text-muted-foreground">{detail.product.brand}</p>
        ) : null}
        <h2 className="text-xl font-semibold leading-tight">{detail.product.name}</h2>
        {detail.product.categoryName ? (
          <p className="text-xs text-muted-foreground">{detail.product.categoryName}</p>
        ) : null}
        <p className="text-xl font-bold">{fmt(price)}</p>

        {hasSelectors ? (
          <div className="space-y-3 border-t border-border pt-3">
            {attributeDimensions.map((dimension) => (
              <div key={dimension} className="space-y-1.5">
                <p className="text-sm font-medium">{dimension}</p>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`min-h-8 cursor-pointer rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? "border-2 border-primary font-medium"
                            : available
                              ? "border border-border hover:border-primary/40"
                              : "cursor-not-allowed border border-border/60 text-muted-foreground opacity-50"
                        }`}
                        data-test-id={`eshop-preview-attr-${dimension}-${value}`}
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

        {selectedVariant?.sku ? (
          <p className="font-mono text-sm text-foreground" data-test-id="eshop-preview-sku">
            SKU: {selectedVariant.sku}
          </p>
        ) : null}

        <p
          className={`text-sm ${stock.inStock ? "text-emerald-700" : "text-destructive"}`}
          data-test-id="eshop-preview-stock"
        >
          {stock.text}
        </p>

        {detail.product.description ? (
          <section className="space-y-1.5 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Descripción</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {detail.product.description}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
