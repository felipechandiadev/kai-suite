"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ListChecks, Tags } from "lucide-react";
import { Card } from "@kai/ui";
import Badge from "@kai/ui";
import { Switch } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import {
  deleteAttributeAction,
  updateAttributeActiveAction,
} from "@/features/inventory-attributes/actions/attribute.action";
import { UpdateAttributeDialog } from "./UpdateAttributeDialog";

type AttributeCardProps = {
  attribute: AttributeListItem;
  "data-test-id"?: string;
};

const OPTION_PREVIEW = 8;

export function AttributeCard({
  attribute,
  "data-test-id": dataTestId,
}: AttributeCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [active, setActive] = useState(attribute.isActive);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(attribute.isActive);
  }, [attribute.isActive, attribute.id]);

  const headerEnd = (
    <span data-test-id="attribute-card-active-label" className="shrink-0">
      <Badge variant={attribute.isActive ? "success" : "secondary-outlined"}>
        {attribute.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="attribute-card-media"
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
        <ListChecks className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const preview = attribute.options.slice(0, OPTION_PREVIEW);
  const rest = Math.max(0, attribute.options.length - preview.length);

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="attribute-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Descripción
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="attribute-card-description">
          {attribute.description?.trim() ? attribute.description.trim() : "Sin descripción"}
        </p>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Opciones ({attribute.options.length})
        </p>
        {attribute.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin opciones</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" data-test-id="attribute-card-option-badges">
            {preview.map((opt, i) => (
              <span key={`${attribute.id}-opt-${i}`} className="inline-block max-w-full" title={opt}>
                <Badge variant="info-outlined" className="max-w-full truncate">
                  {opt}
                </Badge>
              </span>
            ))}
            {rest > 0 ? (
              <Badge variant="secondary-outlined">+{rest} más</Badge>
            ) : null}
          </div>
        )}
      </div>

      {activeError ? (
        <p className="text-sm text-red-600" role="alert" data-test-id="attribute-card-active-error">
          {activeError}
        </p>
      ) : null}

      <div className="mt-auto">
        <Switch
          checked={active}
          disabled={isPending}
          onChange={(v) => {
            setActiveError(null);
            const prev = active;
            setActive(v);
            startTransition(() => {
              void (async () => {
                const r = await updateAttributeActiveAction(attribute.id, v);
                if (!r.success) {
                  setActive(prev);
                  setActiveError(r.error);
                } else {
                  await router.refresh();
                }
              })();
            });
          }}
          label="Activo en catálogo"
          labelPosition="right"
          data-test-id="attribute-card-active-switch"
        />
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
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar atributo",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "attribute-card-update",
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
            "data-test-id": "attribute-card-delete",
          },
        ]}
      />
      <UpdateAttributeDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
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
            ¿Eliminar el atributo <strong className="font-semibold">«{attribute.name}»</strong>? Esta acción no se
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
              const r = await deleteAttributeAction(attribute.id);
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
        data-test-id={`${dataTestId ?? "attribute-card"}-delete-dialog`}
      />
    </>
  );
}
