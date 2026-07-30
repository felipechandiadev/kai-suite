"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { BrandListItem } from "@/features/catalog-brands/types/brand.types";
import { deleteBrandAction } from "@/features/catalog-brands/actions/brand.action";
import { UpdateBrandDialog } from "./UpdateBrandDialog";

type BrandCardProps = {
  brand: BrandListItem;
  "data-test-id"?: string;
};

export function BrandCard({ brand, "data-test-id": dataTestId }: BrandCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusLine = useMemo(() => {
    if (!brand.isActive) {
      return "Inactiva";
    }
    return "Activa";
  }, [brand.isActive]);

  const media = (
    <div
      className="relative flex min-h-30 w-full items-center justify-center overflow-hidden bg-linear-to-br from-primary/12 via-secondary/25 to-accent/15"
      data-test-id="brand-card-media"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Tag className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const descPreview =
    brand.description && brand.description.trim() ? (
      <p className="line-clamp-2 text-sm text-muted-foreground" data-test-id="brand-card-description">
        {brand.description}
      </p>
    ) : (
      <p className="text-sm text-muted-foreground" data-test-id="brand-card-description">
        Sin descripción
      </p>
    );

  const productLabel =
    brand.productCount === 1 ? "1 producto" : `${brand.productCount} productos`;

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={brand.name}
        subtitle={statusLine}
        content={
          <div className="flex flex-col gap-1" data-test-id="brand-card-counts">
            <p className="text-sm text-muted-foreground">{productLabel}</p>
            {descPreview}
          </div>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar marca",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "brand-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar marca",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "brand-card-delete",
          },
        ]}
      />
      <UpdateBrandDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        brand={brand}
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
        title="Eliminar marca"
        message={
          <>
            ¿Eliminar la marca <strong className="font-semibold">«{brand.name}»</strong>? Los productos que la usen
            quedarán sin marca asociada.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteBrandAction(brand.id);
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
        data-test-id={`${dataTestId ?? "brand-card"}-delete-dialog`}
      />
    </>
  );
}
