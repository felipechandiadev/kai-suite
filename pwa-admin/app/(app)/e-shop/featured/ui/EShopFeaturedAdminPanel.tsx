"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Alert } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import type { ListProductsForGridResult } from "@/features/inventory-products/actions/product.action";
import type { EShopFeaturedProductItem } from "@/features/e-shop-featured/types/featured.types";
import { saveFeaturedProductIdsAction } from "@/features/e-shop-featured/actions/featured.action";
import { EShopFeaturedProductSearchPanel } from "./EShopFeaturedProductSearchPanel";
import { EShopFeaturedProductCard } from "./EShopFeaturedProductCard";

function featuredItemToGridRow(item: EShopFeaturedProductItem): ProductGridRow {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    brandId: null,
    description: null,
    categoryId: null,
    categoryName: item.categoryName,
    isActive: item.isActive,
    visibleInEShop: item.visibleInEShop,
    variantCount: item.variantCount,
    variants: [],
    primaryImageUrl: item.imageUrl,
    mediaAssets: item.imageUrl
      ? [{ id: `${item.id}-img`, publicUrl: item.imageUrl, mimeType: "image/*", kind: "image" }]
      : [],
  };
}

type Props = {
  initialFeatured: { productIds: string[]; items: EShopFeaturedProductItem[] };
  productSearch: ListProductsForGridResult;
  searchQuery: string;
  searchPage: number;
};

export function EShopFeaturedAdminPanel({
  initialFeatured,
  productSearch,
  searchQuery,
  searchPage,
}: Props) {
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeatured.productIds);
  const [featuredItems, setFeaturedItems] = useState<EShopFeaturedProductItem[]>(initialFeatured.items);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const featuredRows = useMemo(() => {
    const byId = new Map(featuredItems.map((i) => [i.id, i]));
    return featuredIds
      .map((id) => byId.get(id))
      .filter((i): i is EShopFeaturedProductItem => Boolean(i))
      .map(featuredItemToGridRow);
  }, [featuredIds, featuredItems]);

  const addProduct = useCallback((row: ProductGridRow) => {
    setError(null);
    setFeaturedIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
    setFeaturedItems((prev) => {
      if (prev.some((p) => p.id === row.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: row.id,
          name: row.name,
          brand: row.brand,
          categoryName: row.categoryName,
          visibleInEShop: row.visibleInEShop === true,
          isActive: row.isActive !== false,
          variantCount: row.variantCount,
          imageUrl: row.primaryImageUrl ?? row.mediaAssets?.[0]?.publicUrl ?? null,
        },
      ];
    });
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setError(null);
    setFeaturedIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const save = useCallback(() => {
    setError(null);
    startTransition(() => {
      void saveFeaturedProductIdsAction(featuredIds).then((res) => {
        if (!res.success) {
          setError(res.error);
        }
      });
    });
  }, [featuredIds]);

  const dirty =
    featuredIds.length !== initialFeatured.productIds.length ||
    featuredIds.some((id, i) => id !== initialFeatured.productIds[i]);

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch"
      data-test-id="eshop-featured-admin-panel"
    >
      <EShopFeaturedProductSearchPanel
        search={productSearch}
        searchQuery={searchQuery}
        searchPage={searchPage}
        featuredProductIds={featuredIds}
        onAddProduct={addProduct}
      />

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-background p-3 lg:h-full lg:min-h-0"
        data-test-id="eshop-featured-detail-panel"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Productos destacados</h2>
            <p className="text-xs text-muted-foreground">
              Se muestran en la home del eShop ({featuredIds.length} producto
              {featuredIds.length === 1 ? "" : "s"}).
            </p>
          </div>
          <IconButton
            icon="Save"
            variant="action"
            size="sm"
            ariaLabel="Guardar productos destacados"
            title="Guardar"
            disabled={pending || !dirty}
            isLoading={pending}
            onClick={save}
            data-test-id="eshop-featured-save"
          />
        </div>

        {error ? (
          <Alert variant="error" className="shrink-0">
            {error}
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {featuredRows.length === 0 ? (
            <div
              className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground"
              data-test-id="eshop-featured-empty"
            >
              Busque productos a la izquierda y use + para agregarlos aquí.
            </div>
          ) : (
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
              data-test-id="eshop-featured-grid"
            >
              {featuredRows.map((row) => (
                <EShopFeaturedProductCard
                  key={row.id}
                  product={row}
                  featured
                  onRemove={() => removeProduct(row.id)}
                  data-test-id={`eshop-featured-item-${row.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
