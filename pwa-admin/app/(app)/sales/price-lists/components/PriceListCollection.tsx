"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { PRICE_LIST_TYPE_OPTIONS } from "@/features/sales-price-lists/types/price-list.types";
import { PriceListCollectionAddAction } from "./PriceListCollectionAddAction";
import { PriceListCard } from "./PriceListCard";

type PriceListCollectionProps = {
  initialPriceLists: PriceListListItem[];
};

function typeLabel(t: string): string {
  return PRICE_LIST_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t;
}

export function PriceListCollection({ initialPriceLists }: PriceListCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialPriceLists;
    }
    return initialPriceLists.filter((pl) => {
      const typeStr = typeLabel(pl.priceListType).toLowerCase();
      return (
        pl.name.toLowerCase().includes(q) ||
        (pl.description && pl.description.toLowerCase().includes(q)) ||
        typeStr.includes(q) ||
        pl.priceListType.toLowerCase().includes(q)
      );
    });
  }, [initialPriceLists, q]);

  return (
    <CollectionPageLayout
      title="Listas de precios"
      addAction={<PriceListCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay listas de precio que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((pl) => (
              <PriceListCard key={pl.id} priceList={pl} data-test-id={`price-list-card-${pl.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="price-lists-collection"
    />
  );
}
