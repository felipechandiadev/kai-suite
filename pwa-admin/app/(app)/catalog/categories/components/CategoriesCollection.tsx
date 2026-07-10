"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import { CategoriesCollectionAddAction } from "./CategoriesCollectionAddAction";
import { CategoryCard } from "./CategoryCard";

type CategoriesCollectionProps = {
  initialCategories: CategoryListItem[];
};

/**
 * Búsqueda en cliente (`?search=`) sobre la lista desde el servidor; patrón Colección admin.
 */
export function CategoriesCollection({ initialCategories }: CategoriesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialCategories;
    }
    return initialCategories.filter((c) => {
      const parent = c.parentId
        ? initialCategories.find((x) => x.id === c.parentId)?.name?.toLowerCase() ?? ""
        : "";
      return (
        c.name.toLowerCase().includes(q) ||
        (parent && parent.includes(q))
      );
    });
  }, [initialCategories, q]);

  return (
    <CollectionPageLayout
      addAction={<CategoriesCollectionAddAction allCategories={initialCategories} />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar..."
      contentEmptyMessage="No hay categorías que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                allCategories={initialCategories}
                data-test-id={`category-card-${c.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      data-test-id="categories-collection"
    />
  );
}
