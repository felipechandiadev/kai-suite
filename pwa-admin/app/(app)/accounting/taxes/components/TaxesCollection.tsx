"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { taxTypeLabel } from "@/features/accounting-taxes/types/tax.types";
import { TaxesCollectionAddAction } from "./TaxesCollectionAddAction";
import { TaxCard } from "./TaxCard";

type TaxesCollectionProps = {
  initialTaxes: TaxListItem[];
};

export function TaxesCollection({ initialTaxes }: TaxesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialTaxes;
    }
    return initialTaxes.filter((t) => {
      const typeLabel = taxTypeLabel(t.taxType).toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.code ?? "").toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        desc.includes(q)
      );
    });
  }, [initialTaxes, q]);

  return (
    <CollectionPageLayout
      title="Impuestos"
      addAction={<TaxesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="buscar"
      contentEmptyMessage="No hay impuestos que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((t) => (
              <TaxCard key={t.id} tax={t} data-test-id={`tax-card-${t.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="taxes-collection"
    />
  );
}
