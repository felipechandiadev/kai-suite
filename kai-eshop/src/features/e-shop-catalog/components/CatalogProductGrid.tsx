"use client";

import { useEffect, useState } from "react";
import type { EShopProductCard } from "@/features/e-shop-storefront/types/storefront.types";
import { EShopProductCard } from "@/shared/components/EShopProductCard";

type CatalogProductGridProps = {
  items: EShopProductCard[];
};

export function CatalogProductGrid({ items }: CatalogProductGridProps) {
  const [rows, setRows] = useState(items);

  useEffect(() => {
    setRows(items);
  }, [items]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay productos para mostrar.</p>;
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      data-test-id="catalog-product-grid"
    >
      {rows.map((product) => (
        <EShopProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
