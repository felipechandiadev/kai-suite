"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderTree } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import { deleteCategoryAction } from "@/features/inventory-categories/actions/category.action";
import { UpdateCategoryDialog } from "./UpdateCategoryDialog";

type CategoryCardProps = {
  category: CategoryListItem;
  allCategories: CategoryListItem[];
  "data-test-id"?: string;
};

export function CategoryCard({
  category,
  allCategories,
  "data-test-id": dataTestId,
}: CategoryCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const parentName = useMemo(() => {
    if (!category.parentId) {
      return null;
    }
    return allCategories.find((c) => c.id === category.parentId)?.name ?? null;
  }, [allCategories, category.parentId]);

  const subtitle = parentName ? `Padre: ${parentName}` : "Raíz";

  const media = (
    <div
      className="flex min-h-28 w-full items-center justify-center bg-neutral-100"
      data-test-id="category-card-media"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border">
        <FolderTree className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      </div>
    </div>
  );

  const productLabel = category.productCount === 1 ? "1 producto" : `${category.productCount} productos`;
  const childLabel =
    category.childCount === 1 ? "1 subcategoría" : `${category.childCount} subcategorías`;

  return (
    <>
      <Card
        data-test-id={dataTestId}
        media={media}
        title={category.name}
        subtitle={subtitle}
        content={
          <p className="text-sm text-muted-foreground" data-test-id="category-card-counts">
            {productLabel} · {childLabel}
          </p>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar categoría",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "category-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar categoría",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "category-card-delete",
          },
        ]}
      />
      <UpdateCategoryDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        category={category}
        allCategories={allCategories}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar categoría"
        message={
          <>
            ¿Eliminar la categoría <strong className="font-semibold">«{category.name}»</strong>? Esta acción no se
            puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteCategoryAction(category.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "category-card"}-delete-dialog`}
      />
    </>
  );
}
