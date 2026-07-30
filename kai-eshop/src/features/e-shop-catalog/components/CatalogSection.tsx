"use client";

import type { EShopProductCard } from "@/features/e-shop-storefront/types/storefront.types";
import type { EShopCatalogCategoryOption } from "../types/catalog.types";
import { CatalogPagination } from "./CatalogPagination";
import { CatalogProductGrid } from "./CatalogProductGrid";
import { CatalogToolbar } from "./CatalogToolbar";

type CatalogSectionProps = {
  items: EShopProductCard[];
  categories: EShopCatalogCategoryOption[];
  total: number;
  totalGeneral: number;
};

export function CatalogSection({
  items,
  categories,
  total,
  totalGeneral,
}: CatalogSectionProps) {
  return (
    <section id="catalogo" className="scroll-mt-20 space-y-6">
      <CatalogToolbar categories={categories} />
      <CatalogProductGrid items={items} />
      <CatalogPagination total={total} totalGeneral={totalGeneral} />
    </section>
  );
}
