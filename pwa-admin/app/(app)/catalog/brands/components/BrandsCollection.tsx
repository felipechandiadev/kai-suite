"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { BrandListItem } from "@/features/catalog-brands/types/brand.types";
import { BrandsCollectionAddAction } from "./BrandsCollectionAddAction";
import { BrandCard } from "./BrandCard";

type BrandsCollectionProps = {
  initialBrands: BrandListItem[];
};

export function BrandsCollection({ initialBrands }: BrandsCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialBrands;
    }
    return initialBrands.filter((b) => {
      const inName = b.name.toLowerCase().includes(q);
      const inDesc = (b.description ?? "").toLowerCase().includes(q);
      return inName || inDesc;
    });
  }, [initialBrands, q]);

  return (
    <CollectionPageLayout
      addAction={<BrandsCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay marcas que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((b) => (
              <BrandCard key={b.id} brand={b} data-test-id={`brand-card-${b.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      data-test-id="brands-collection"
    />
  );
}
