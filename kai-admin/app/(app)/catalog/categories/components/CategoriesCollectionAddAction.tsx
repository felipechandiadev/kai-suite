"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import { CreateCategoryDialog } from "./CreateCategoryDialog";

type Props = {
  allCategories: CategoryListItem[];
};

export function CategoriesCollectionAddAction({ allCategories }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear categoría"
        onClick={() => setOpen(true)}
        data-test-id="categories-collection-add"
      />
      <CreateCategoryDialog
        open={open}
        onClose={() => setOpen(false)}
        allCategories={allCategories}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
