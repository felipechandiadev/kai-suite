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
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="category-card-media"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <FolderTree className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const productLabel = category.productCount === 1 ? "1 producto" : `${category.productCount} productos`;
  const childLabel =
    category.childCount === 1 ? "1 subcategoría" : `${category.childCount} subcategorías`;

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
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
