"use client";

import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import { Badge } from "@kai/ui";

type Props = {
  product: ProductGridRow;
  featured?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  "data-test-id"?: string;
};

export function EShopFeaturedProductCard({
  product,
  featured = false,
  onSelect,
  onRemove,
  "data-test-id": dataTestId,
}: Props) {
  const imageUrl = product.primaryImageUrl ?? product.mediaAssets?.[0]?.publicUrl ?? null;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border bg-background transition-shadow ${
        featured ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/30 hover:shadow-sm"
      } ${onSelect ? "cursor-pointer" : ""}`}
      data-test-id={dataTestId}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
        )}
        {featured ? (
          <Badge variant="primary" className="absolute left-2 top-2 text-[10px]">
            Destacado
          </Badge>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.name}</p>
        {product.brand ? (
          <p className="truncate text-xs text-muted-foreground">{product.brand}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          {product.variantCount} variante{product.variantCount === 1 ? "" : "s"}
          {product.categoryName ? ` · ${product.categoryName}` : ""}
        </p>
        {onRemove ? (
          <button
            type="button"
            className="mt-1 self-start text-xs text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            Quitar
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function gridRowToFeaturedCardProduct(row: ProductGridRow) {
  return row;
}
