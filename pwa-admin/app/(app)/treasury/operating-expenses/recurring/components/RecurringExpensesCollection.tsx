"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionPageLayout, Button } from "@kai/ui";
import type { RecurringExpenseListItem } from "@/features/treasury-recurring-expenses/types/recurring-expense.types";
import type { ExpenseCategoryOption } from "@/features/treasury-expenses/types/operational-expense.types";
import { RecurringExpenseCard } from "./RecurringExpenseCard";
import { RecurringExpenseFormDialog } from "./RecurringExpenseFormDialog";

type Props = {
  initialRows: RecurringExpenseListItem[];
  categories: ExpenseCategoryOption[];
};

export function RecurringExpensesCollection({ initialRows, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [createOpen, setCreateOpen] = useState(false);

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
        addAction={
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateOpen(true)}
            data-test-id="recurring-expense-add"
          >
            Crear
          </Button>
        }
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar"
        contentEmptyMessage="No hay gastos recurrentes"
        contentItems={
          filtered.length > 0
            ? filtered.map((item) => (
                <RecurringExpenseCard
                  key={item.id}
                  item={item}
                  categoryOptions={categories}
                />
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="recurring-expenses-collection"
      />
      <RecurringExpenseFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => router.refresh()}
        categoryOptions={categories}
        mode="create"
      />
    </>
  );
}
