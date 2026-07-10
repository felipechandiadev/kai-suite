"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import { AttributesCollectionAddAction } from "./AttributesCollectionAddAction";
import { AttributeCard } from "./AttributeCard";

type AttributesCollectionProps = {
  initialAttributes: AttributeListItem[];
};

export function AttributesCollection({ initialAttributes }: AttributesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialAttributes;
    }
    return initialAttributes.filter((a) => {
      const desc = (a.description ?? "").toLowerCase();
      const inOptions = a.options.some((o) => o.toLowerCase().includes(q));
      return a.name.toLowerCase().includes(q) || desc.includes(q) || inOptions;
    });
  }, [initialAttributes, q]);

  return (
    <CollectionPageLayout
      addAction={<AttributesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay atributos que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((a) => (
              <AttributeCard
                key={a.id}
                attribute={a}
                data-test-id={`attribute-card-${a.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="attributes-collection"
    />
  );
}
