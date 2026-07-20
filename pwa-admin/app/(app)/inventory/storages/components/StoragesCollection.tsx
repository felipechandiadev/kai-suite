"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { storageCategoryLabel, storageTypeLabel } from "@/features/inventory-storages/types/storage.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { StoragesCollectionAddAction } from "./StoragesCollectionAddAction";
import { StorageCard } from "./StorageCard";

type StoragesCollectionProps = {
  initialStorages: StorageListItem[];
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

export function StoragesCollection({
  initialStorages,
  branches,
  laborUnits = [],
}: StoragesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialStorages;
    }
    return initialStorages.filter((s) => {
      const branch = s.branch?.name?.toLowerCase() ?? "";
      const code = (s.code ?? "").toLowerCase();
      const addr = (s.address ?? "").toLowerCase();
      const type = storageTypeLabel(s.type).toLowerCase();
      const cat = storageCategoryLabel(s.category).toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        branch.includes(q) ||
        code.includes(q) ||
        addr.includes(q) ||
        type.includes(q) ||
        cat.includes(q)
      );
    });
  }, [initialStorages, q]);

  return (
    <CollectionPageLayout
      title="Almacenes"
      addAction={
        <StoragesCollectionAddAction
          branches={branches}
          laborUnits={laborUnits}
        />
      }
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay almacenes que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((s) => (
              <StorageCard
                key={s.id}
                storage={s}
                branches={branches}
                laborUnits={laborUnits}
                data-test-id={`storage-card-${s.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="storages-collection"
    />
  );
}
