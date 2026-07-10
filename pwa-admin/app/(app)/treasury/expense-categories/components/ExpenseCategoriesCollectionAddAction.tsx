"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import type { OperationalGroupMetaItem } from "@/features/expense-categories/types/expense-category.types";
import { CreateExpenseCategoryDialog } from "./CreateExpenseCategoryDialog";

type Props = {
  groupOptions: OperationalGroupMetaItem[];
};

export function ExpenseCategoriesCollectionAddAction({ groupOptions }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear categoría de gasto"
        onClick={() => setOpen(true)}
        data-test-id="expense-categories-collection-add"
      />
      <CreateExpenseCategoryDialog
        open={open}
        onClose={() => setOpen(false)}
        groupOptions={groupOptions}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
