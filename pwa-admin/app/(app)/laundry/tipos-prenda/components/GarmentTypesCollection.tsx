"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { GarmentType } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { GarmentTypesCollectionAddAction } from "./GarmentTypesCollectionAddAction";
import { GarmentTypeCard } from "./GarmentTypeCard";

type GarmentTypesCollectionProps = {
  initialTypes: GarmentType[];
};

export function GarmentTypesCollection({ initialTypes }: GarmentTypesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialTypes;
    return initialTypes.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
    );
  }, [initialTypes, q]);

  return (
    <CollectionPageLayout
      title="Tipos de prenda"
      addAction={<GarmentTypesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay tipos de prenda que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((t) => (
              <GarmentTypeCard key={t.id} type={t} data-test-id={`garment-type-card-${t.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      data-test-id="garment-types-collection"
    />
  );
}
