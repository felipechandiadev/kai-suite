"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { DotProgress } from "@kai/ui";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";
import { lookupOfflineCatalogByVariantIds } from "@/features/pos-offline/application/search-offline-catalog.usecase";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import {
  POS_FAVORITE_PRODUCTS_CHANGED_EVENT,
  readPosFavoriteProducts,
} from "../lib/pos-favorite-products-storage";

type PosFavoriteQuickPickBarProps = {
  pointOfSaleId: string;
  priceListId: string;
  branchId: string | null;
  disabled?: boolean;
  onPickProduct?: (item: PosProductSearchItem) => void;
};

export function PosFavoriteQuickPickBar({
  pointOfSaleId,
  priceListId,
  branchId,
  disabled = false,
  onPickProduct,
}: PosFavoriteQuickPickBarProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PosProductSearchItem[]>([]);
  const [storedCount, setStoredCount] = useState(0);

  const load = useCallback(async () => {
    const stored = readPosFavoriteProducts(pointOfSaleId);
    setStoredCount(stored.length);
    if (!priceListId.trim() || stored.length === 0) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let products: PosProductSearchItem[] = [];
      if (shouldUseBackendApi()) {
        const res = await lookupPosVariantsAction({
          variantIds: stored.map((f) => f.variantId),
          pointOfSaleId,
          branchId,
          priceListId,
        });
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setItems([]);
          return;
        }
        products = res.products;
      } else {
        products = await lookupOfflineCatalogByVariantIds({
          pointOfSaleId,
          priceListId,
          variantIds: stored.map((f) => f.variantId),
        });
      }
      const order = stored.map((f) => f.variantId);
      const byId = new Map(products.map((p) => [p.variantId, p]));
      const ordered = order
        .map((id) => byId.get(id))
        .filter((p): p is PosProductSearchItem => Boolean(p));
      setItems(ordered);
    } finally {
      setLoading(false);
    }
  }, [pointOfSaleId, priceListId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<{ pointOfSaleId?: string }>).detail;
      if (detail?.pointOfSaleId && detail.pointOfSaleId !== pointOfSaleId) return;
      void load();
    };
    window.addEventListener(POS_FAVORITE_PRODUCTS_CHANGED_EVENT, onChanged);
    return () =>
      window.removeEventListener(POS_FAVORITE_PRODUCTS_CHANGED_EVENT, onChanged);
  }, [load, pointOfSaleId]);

  if (storedCount === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
        data-test-id="pos-favorite-quickpick-empty"
      >
        Sin favoritos. Configúralos en Ajustes → Productos favoritos.
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center rounded-lg border border-border py-4">
        <DotProgress />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p
        className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"
        data-test-id="pos-favorite-quickpick-none-in-list"
      >
        Ningún favorito tiene precio en la lista de precios actual.
      </p>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-muted/30 px-1.5 py-1"
      data-test-id="pos-favorite-quickpick-bar"
    >
      <div className="mb-1 flex items-center gap-1 px-0.5">
        <Star className="h-3 w-3 text-amber-600" strokeWidth={2} aria-hidden />
        <span className="text-[10px] font-medium text-foreground">Favoritos</span>
        <span className="text-[10px] text-muted-foreground">
          ({items.length}
          {storedCount > items.length ? ` de ${storedCount}` : ""})
        </span>
      </div>
      <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
        {items.map((item) => {
          const canPick = !disabled && !!onPickProduct;
          return (
            <button
              key={item.variantId}
              type="button"
              disabled={!canPick}
              onClick={() => onPickProduct?.(item)}
              className={`max-w-[9rem] shrink-0 rounded-md border px-1.5 py-1 text-left transition-colors ${
                canPick
                  ? "border-border bg-surface hover:border-secondary active:bg-secondary/10"
                  : "cursor-not-allowed border-border opacity-60"
              }`}
              data-test-id={`pos-favorite-quickpick-${item.variantId}`}
            >
              <PosProductNameWithAttributes
                name={item.productName}
                attributes={item.attributes}
                attributeSeparator="slash"
                className="line-clamp-2 text-[10px] font-medium leading-tight text-foreground"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
