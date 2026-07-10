"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Percent, Tag } from "lucide-react";
import { Card } from "@kai/ui";
import { Badge } from "@kai/ui";
import { Switch } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { formatTaxRate, taxTypeLabel } from "@/features/accounting-taxes/types/tax.types";
import { deleteTaxAction, updateTaxActiveAction } from "@/features/accounting-taxes/actions/tax.action";
import { UpdateTaxDialog } from "./UpdateTaxDialog";

type TaxCardProps = {
  tax: TaxListItem;
  "data-test-id"?: string;
};

export function TaxCard({ tax, "data-test-id": dataTestId }: TaxCardProps) {
  const router = useRouter();
  const deleteLocked = tax.nonDeletable === true;
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [active, setActive] = useState(tax.isActive);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(tax.isActive);
  }, [tax.isActive, tax.id]);

  const headerEnd = (
    <span data-test-id="tax-card-active-label" className="shrink-0">
      <Badge variant={tax.isActive ? "success" : "secondary-outlined"}>
        {tax.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="tax-card-media"
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
        <Percent className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="tax-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Percent className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Tasa
        </p>
        <p className="text-lg font-semibold tabular-nums text-foreground" data-test-id="tax-card-rate">
          {formatTaxRate(tax.rate)}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Descripción
        </p>
        <p className="text-sm leading-snug text-foreground" data-test-id="tax-card-description">
          {tax.description?.trim() ? tax.description.trim() : "Sin descripción"}
        </p>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tag className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Tipo
        </p>
        <div className="flex flex-wrap gap-1.5" data-test-id="tax-card-badges">
          <Badge variant="info-outlined">{taxTypeLabel(tax.taxType)}</Badge>
          {tax.isDefault ? <Badge variant="warning-outlined">Predeterminado</Badge> : null}
        </div>
      </div>

      {activeError ? (
        <p className="text-sm text-red-600" role="alert" data-test-id="tax-card-active-error">
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
                const r = await updateTaxActiveAction(tax.id, v);
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
          data-test-id="tax-card-active-switch"
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
        title={tax.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar impuesto",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "tax-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: deleteLocked ? "Este impuesto no se puede eliminar" : "Eliminar impuesto",
            disabled: isDeleting || deleteLocked,
            onClick: () => {
              if (deleteLocked) {
                return;
              }
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "tax-card-delete",
          },
        ]}
      />
      <UpdateTaxDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        tax={tax}
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
        title="Eliminar impuesto"
        message={
          <>
            ¿Eliminar el impuesto <strong className="font-semibold">«{tax.name}»</strong>? Esta acción no se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteTaxAction(tax.id);
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
        data-test-id={`${dataTestId ?? "tax-card"}-delete-dialog`}
      />
    </>
  );
}
