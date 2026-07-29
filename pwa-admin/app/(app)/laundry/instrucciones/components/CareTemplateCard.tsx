"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Card, DeleteDialog } from "@kai/ui";
import type { CareTemplate } from "@/features/laundry-catalog/types/laundry-catalog.types";
import { deleteCareTemplateAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { UpdateCareTemplateDialog } from "./UpdateCareTemplateDialog";

type CareTemplateCardProps = {
  template: CareTemplate;
  "data-test-id"?: string;
};

export function CareTemplateCard({ template, "data-test-id": dataTestId }: CareTemplateCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusLine = useMemo(() => (template.active ? "Activo" : "Inactivo"), [template.active]);
  const textPreview =
    template.text.trim().length > 0 ? (
      <p className="line-clamp-3 text-sm text-muted-foreground">{template.text}</p>
    ) : (
      <p className="text-sm text-muted-foreground">Sin texto</p>
    );

  const media = (
    <div className="relative flex min-h-30 w-full items-center justify-center overflow-hidden bg-linear-to-br from-primary/12 via-secondary/25 to-accent/15">
      <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Sparkles className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
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
        title={template.label}
        subtitle={statusLine}
        content={textPreview}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar instrucción de cuidado",
            onClick: () => setUpdateOpen(true),
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar instrucción de cuidado",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <UpdateCareTemplateDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        template={template}
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
        title="Eliminar instrucción de cuidado"
        message={
          <>
            ¿Eliminar la instrucción <strong className="font-semibold">«{template.label}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteCareTemplateAction(template.id);
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
