"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { dimensionLabel } from "@/features/inventory-units/types/unit.types";
import { UnitsCollectionAddAction } from "./UnitsCollectionAddAction";
import { UnitCard } from "./UnitCard";

type UnitsCollectionProps = {
  initialUnits: UnitListItem[];
};

export function UnitsCollection({ initialUnits }: UnitsCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialUnits;
    }
    return initialUnits.filter((u) => {
      const dim = dimensionLabel(u.dimension).toLowerCase();
      const base = (u.baseUnitName ?? "").toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.symbol.toLowerCase().includes(q) ||
        dim.includes(q) ||
        base.includes(q)
      );
    });
  }, [initialUnits, q]);

  return (
    <CollectionPageLayout
      title="Unidades de medida"
      addAction={<UnitsCollectionAddAction allUnits={initialUnits} />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar por nombre, símbolo, dimensión o base"
      contentEmptyMessage="No hay unidades que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((u) => (
              <UnitCard
                key={u.id}
                unit={u}
                allUnits={initialUnits}
                data-test-id={`unit-card-${u.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="units-collection"
    />
  );
}
