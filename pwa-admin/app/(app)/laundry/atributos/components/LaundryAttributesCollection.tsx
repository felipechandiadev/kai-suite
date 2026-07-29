"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { GarmentAttribute } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { LaundryAttributesCollectionAddAction } from "./LaundryAttributesCollectionAddAction";
import { LaundryAttributeCard } from "./LaundryAttributeCard";

type LaundryAttributesCollectionProps = {
  initialAttributes: GarmentAttribute[];
};

export function LaundryAttributesCollection({ initialAttributes }: LaundryAttributesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialAttributes;
    return initialAttributes.filter((a) => {
      const inValues = a.values.some((v) => v.label.toLowerCase().includes(q));
      return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || inValues;
    });
  }, [initialAttributes, q]);

  return (
    <CollectionPageLayout
      title="Atributos"
      addAction={<LaundryAttributesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay atributos que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((a) => (
              <LaundryAttributeCard
                key={a.id}
                attribute={a}
                data-test-id={`laundry-attribute-card-${a.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="laundry-attributes-collection"
    />
  );
}
