"use client";

import Link from "next/link";
import { IconButton } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import type { EShopProductCard as Product } from "@/features/e-shop-storefront/types/storefront.types";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

function productDetailHref(product: Product): string {
  const base = `/productos/p/${product.id}`;
  if (product.defaultVariantId?.trim()) {
    return `${base}?variant=${encodeURIComponent(product.defaultVariantId.trim())}`;
  }
  return base;
}

type Props = {
  product: Product;
};

export function EShopProductCard({ product }: Props) {
  const { addItem } = useEShopCart();
  const href = productDetailHref(product);
  const canAddToCart = product.inStock && Boolean(product.defaultVariantId?.trim());

  return (
    <article className="flex flex-col rounded-xl border border-border overflow-hidden">
      <Link href={href} className="block aspect-square bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={href} className="text-xs font-medium hover:text-primary md:text-sm">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="text-xs font-semibold md:text-sm">{fmt(product.basePrice)}</p>
          <IconButton
            icon="Plus"
            variant="secondaryCircle"
            size="sm"
            ariaLabel={product.inStock ? "Agregar al carrito" : "Agotado"}
            disabled={!canAddToCart}
            onClick={() => {
              if (!canAddToCart || !product.defaultVariantId) {
                return;
              }
              addItem({
                productVariantId: product.defaultVariantId,
                unitPrice: product.basePrice,
                name: product.name,
                imageUrl: product.imageUrl,
              });
            }}
          />
        </div>
      </div>
    </article>
  );
}
