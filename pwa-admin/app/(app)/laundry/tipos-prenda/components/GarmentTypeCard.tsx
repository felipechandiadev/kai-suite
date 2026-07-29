"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shirt } from "lucide-react";
import { Card, DeleteDialog } from "@kai/ui";
import type { GarmentType } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { deleteGarmentTypeAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { UpdateGarmentTypeDialog } from "./UpdateGarmentTypeDialog";

type GarmentTypeCardProps = {
  type: GarmentType;
  "data-test-id"?: string;
};

export function GarmentTypeCard({ type, "data-test-id": dataTestId }: GarmentTypeCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusLine = useMemo(() => (type.active ? "Activo" : "Inactivo"), [type.active]);

  const media = (
    <div className="relative flex min-h-30 w-full items-center justify-center overflow-hidden bg-linear-to-br from-primary/12 via-secondary/25 to-accent/15">
      <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Shirt className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={type.name}
        subtitle={statusLine}
        content={
          <p className="text-sm text-muted-foreground">
            Código: <span className="font-mono">{type.code}</span>
          </p>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar tipo de prenda",
            onClick: () => setUpdateOpen(true),
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar tipo de prenda",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <UpdateGarmentTypeDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        type={type}
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
        title="Eliminar tipo de prenda"
        message={
          <>
            ¿Eliminar el tipo de prenda <strong className="font-semibold">«{type.name}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteGarmentTypeAction(type.id);
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
      />
    </>
  );
}
