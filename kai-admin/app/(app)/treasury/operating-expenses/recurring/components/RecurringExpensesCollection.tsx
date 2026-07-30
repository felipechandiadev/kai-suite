"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { RecurringExpenseListItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import type { ExpenseCategoryOption } from "@/features/treasury-expenses/types/operational-expense.types";
import { CreateOperationalExpenseDialog } from "../../expenses/ui/CreateOperationalExpenseDialog";
import { RecurringExpenseCard } from "./RecurringExpenseCard";

type Props = {
  initialRows: RecurringExpenseListItem[];
  categories: ExpenseCategoryOption[];
};

export function RecurringExpensesCollection({ initialRows, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [templateForCreate, setTemplateForCreate] =
    useState<RecurringExpenseListItem | null>(null);

  const filtered = useMemo(() => {
    if (!q) return initialRows;
    return initialRows.filter((r) =>
      [r.name, r.categoryName, r.supplierName, r.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [initialRows, q]);

  return (
    <>
      <CollectionPageLayout
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar plantilla"
        contentEmptyMessage="No hay plantillas. Márcalas al registrar un gasto operativo."
        contentItems={
          filtered.length > 0
            ? filtered.map((item) => (
                <RecurringExpenseCard
                  key={item.id}
                  item={item}
                  onUseTemplate={setTemplateForCreate}
                />
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="recurring-expenses-collection"
      />
      <CreateOperationalExpenseDialog
        open={templateForCreate != null}
        onClose={() => setTemplateForCreate(null)}
        onSuccess={() => router.refresh()}
        categoryOptions={categories}
        hideSaveAsTemplate
        initialValues={
          templateForCreate
            ? {
                name: templateForCreate.name,
                categoryId: templateForCreate.categoryId,
                supplierId: templateForCreate.supplierId,
                documentKind: templateForCreate.documentKind,
                description: templateForCreate.description,
                taxId: templateForCreate.taxId,
              }
            : null
        }
      />
    </>
  );
}
