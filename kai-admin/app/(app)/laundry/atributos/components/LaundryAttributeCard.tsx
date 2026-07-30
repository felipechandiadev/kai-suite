"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import { Badge, Button, Card, DeleteDialog } from "@kai/ui";
import type { GarmentAttribute } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { deleteGarmentAttributeAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { ManageAttributeValuesDialog } from "./ManageAttributeValuesDialog";
import { UpdateLaundryAttributeDialog } from "./UpdateLaundryAttributeDialog";

type LaundryAttributeCardProps = {
  attribute: GarmentAttribute;
  "data-test-id"?: string;
};

export function LaundryAttributeCard({ attribute, "data-test-id": dataTestId }: LaundryAttributeCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [valuesOpen, setValuesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusLine = useMemo(() => (attribute.active ? "Activo" : "Inactivo"), [attribute.active]);
  const activeValues = attribute.values.filter((v) => v.active);
  const previewValues = activeValues.slice(0, 4);

  const media = (
    <div className="relative flex min-h-30 w-full items-center justify-center overflow-hidden bg-linear-to-br from-primary/12 via-secondary/25 to-accent/15">
      <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Tags className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
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
        title={attribute.name}
        subtitle={statusLine}
        content={
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Código: <span className="font-mono">{attribute.code}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {attribute.values.length === 1
                ? "1 valor"
                : `${attribute.values.length} valores`}
            </p>
            {previewValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {previewValues.map((v) => (
                  <Badge key={v.id} variant="secondary">
                    {v.label}
                  </Badge>
                ))}
                {activeValues.length > previewValues.length && (
                  <Badge variant="secondary">
                    +{activeValues.length - previewValues.length}
                  </Badge>
                )}
              </div>
            )}
            <Button
              variant="outlined"
              size="sm"
              className="mt-1 w-full"
              onClick={() => setValuesOpen(true)}
            >
              Gestionar valores
            </Button>
          </div>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar atributo",
            onClick: () => setUpdateOpen(true),
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar atributo",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <UpdateLaundryAttributeDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        attribute={attribute}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <ManageAttributeValuesDialog
        open={valuesOpen}
        onClose={() => setValuesOpen(false)}
        attribute={attribute}
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
        title="Eliminar atributo"
        message={
          <>
            ¿Eliminar el atributo <strong className="font-semibold">«{attribute.name}»</strong> y sus
            valores?
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteGarmentAttributeAction(attribute.id);
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
