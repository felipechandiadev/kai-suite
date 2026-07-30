"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { CareTemplate } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { CareTemplatesCollectionAddAction } from "./CareTemplatesCollectionAddAction";
import { CareTemplateCard } from "./CareTemplateCard";

type CareTemplatesCollectionProps = {
  initialTemplates: CareTemplate[];
};

export function CareTemplatesCollection({ initialTemplates }: CareTemplatesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialTemplates;
    return initialTemplates.filter(
      (t) => t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q),
    );
  }, [initialTemplates, q]);

  return (
    <CollectionPageLayout
      title="Instrucciones de cuidado"
      addAction={<CareTemplatesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay instrucciones que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((t) => (
              <CareTemplateCard key={t.id} template={t} data-test-id={`care-template-card-${t.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="care-templates-collection"
    />
  );
}
