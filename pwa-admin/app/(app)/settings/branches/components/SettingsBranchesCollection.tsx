"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { LaborUnitView } from "@/features/hr-labor-units/types/labor-unit.types";
import { BranchesCollectionAddAction } from "./BranchesCollectionAddAction";
import { BranchCard } from "./BranchCard";

type SettingsBranchesCollectionProps = {
  initialBranches: BranchListItem[];
  laborUnits?: LaborUnitView[];
};

/**
 * Búsqueda y filtrado en cliente (query `?search=`), sobre datos ya resueltos en el servidor.
 */
export function SettingsBranchesCollection({
  initialBranches,
  laborUnits = [],
}: SettingsBranchesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialBranches;
    return initialBranches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q))
    );
  }, [initialBranches, q]);

  return (
    <CollectionPageLayout
      title="Sucursales"
      addAction={<BranchesCollectionAddAction laborUnits={laborUnits} />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay sucursales que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
                laborUnits={laborUnits}
                data-test-id={`branch-card-${b.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
    />
  );
}
