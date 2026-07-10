"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { AutomationRuleDto } from "@/features/automation/types/automation.types";
import { AutomationRulesCollectionAddAction } from "./AutomationRulesCollectionAddAction";
import { AutomationRuleCard } from "./AutomationRuleCard";

type Props = {
  initialRules: AutomationRuleDto[];
};

export function AutomationRulesCollection({ initialRules }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialRules;
    return initialRules.filter((r) => {
      const actionsText = (r.actions ?? []).map((a) => a.type).join(" ").toLowerCase();
      const filtersText = JSON.stringify(r.filters ?? {}).toLowerCase();
      return (
        r.eventType.toLowerCase().includes(q) ||
        actionsText.includes(q) ||
        filtersText.includes(q) ||
        String(r.priority).includes(q)
      );
    });
  }, [initialRules, q]);

  return (
    <CollectionPageLayout
      title="Automatizaciones"
      addAction={<AutomationRulesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar por evento, filtros, prioridad o acciones"
      contentEmptyMessage="No hay reglas que mostrar"
      contentItems={
        filtered.length > 0 ? filtered.map((r) => <AutomationRuleCard key={r.id} rule={r} />) : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="automation-rules-collection"
    />
  );
}

