"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type {
  ExpenseCategoryListItem,
  OperationalGroupMetaItem,
} from "@/features/expense-categories/types/expense-category.types";
import { EXPENSE_CATEGORY_PNL_NATURE_META } from "@/features/expense-categories/types/expense-category.types";
import { ExpenseCategoriesCollectionAddAction } from "./ExpenseCategoriesCollectionAddAction";
import { ExpenseCategoryCard } from "./ExpenseCategoryCard";

type ExpenseCategoriesCollectionProps = {
  initialCategories: ExpenseCategoryListItem[];
  groupOptions: OperationalGroupMetaItem[];
};

export function ExpenseCategoriesCollection({
  initialCategories,
  groupOptions,
}: ExpenseCategoriesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const metaByValue = useMemo(() => {
    const m = new Map<string, OperationalGroupMetaItem>();
    for (const x of groupOptions) {
      m.set(x.value, x);
    }
    return m;
  }, [groupOptions]);

  const filtered = useMemo(() => {
    if (!q) {
      return initialCategories;
    }
    return initialCategories.filter((c) => {
      const meta = metaByValue.get(c.operationalExpenseGroup);
      const groupBlob = meta ? `${meta.label} ${meta.description}`.toLowerCase() : c.operationalExpenseGroup.toLowerCase();
      const pnlMeta = EXPENSE_CATEGORY_PNL_NATURE_META.find((x) => x.value === c.pnlNature);
      const pnlBlob = pnlMeta
        ? `${pnlMeta.label} ${pnlMeta.description}`.toLowerCase()
        : c.pnlNature.toLowerCase();
      return (
        (c.code ?? "").toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        groupBlob.includes(q) ||
        c.operationalExpenseGroup.toLowerCase().includes(q) ||
        pnlBlob.includes(q) ||
        c.pnlNature.toLowerCase().includes(q)
      );
    });
  }, [initialCategories, metaByValue, q]);

  return (
    <CollectionPageLayout
      addAction={<ExpenseCategoriesCollectionAddAction groupOptions={groupOptions} />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay categorías que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((c) => (
              <ExpenseCategoryCard
                key={c.id}
                category={c}
                groupOptions={groupOptions}
                data-test-id={`expense-category-card-${c.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="expense-categories-collection"
    />
  );
}
