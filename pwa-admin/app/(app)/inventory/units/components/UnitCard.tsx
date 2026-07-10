"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hash, Layers, Ruler, Tags } from "lucide-react";
import { Card } from "@kai/ui";
import Badge from "@kai/ui";
import { Switch } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { dimensionLabel } from "@/features/inventory-units/types/unit.types";
import { deleteUnitAction, updateUnitActiveAction } from "@/features/inventory-units/actions/unit.action";
import { UpdateUnitDialog } from "./UpdateUnitDialog";

type UnitCardProps = {
  unit: UnitListItem;
  allUnits: UnitListItem[];
  "data-test-id"?: string;
};

function conversionLine(unit: UnitListItem): string {
  if (unit.isBase) {
    return `Unidad base de ${dimensionLabel(unit.dimension)}`;
  }
  const bs = unit.baseUnitSymbol ?? "?";
  return `1 ${unit.symbol} = ${unit.conversionFactor} ${bs}`;
}

export function UnitCard({
  unit,
  allUnits,
  "data-test-id": dataTestId,
}: UnitCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [active, setActive] = useState(unit.active);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(unit.active);
  }, [unit.active, unit.id]);

  const headerEnd = (
    <span data-test-id="unit-card-active-label" className="shrink-0">
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {unit.isDefault ? (
          <Badge variant="primary-outlined" data-test-id="unit-card-default-badge">
            Predeterminada
          </Badge>
        ) : null}
        <Badge variant={unit.active ? "success" : "secondary-outlined"}>
          {unit.active ? "Activa" : "Inactiva"}
        </Badge>
      </span>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="unit-card-media"
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
        <Ruler className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="unit-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Ruler className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Conversión
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="unit-card-conversion">
          {conversionLine(unit)}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Símbolo
        </p>
        <p className="font-mono text-sm font-medium text-foreground" data-test-id="unit-card-symbol">
          {unit.symbol}
        </p>
      </div>

      {unit.isBase && unit.activeDerivedCount > 0 ? (
        <div className="rounded-lg border border-border/60 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Derivadas
          </p>
          <p className="text-sm text-foreground" data-test-id="unit-card-derived-count">
            {unit.activeDerivedCount} activa{unit.activeDerivedCount === 1 ? "" : "s"} en esta base
          </p>
        </div>
      ) : null}

      {!unit.isBase && unit.baseUnitName ? (
        <div className="rounded-lg border border-border/60 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Unidad base
          </p>
          <p className="text-sm font-medium text-foreground" data-test-id="unit-card-base-ref">
            {unit.baseUnitName}
            {unit.baseUnitSymbol ? ` (${unit.baseUnitSymbol})` : ""}
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Detalles
        </p>
        <div className="flex flex-wrap gap-1.5" data-test-id="unit-card-badges">
          <Badge variant={unit.isBase ? "primary" : "info-outlined"}>
            {unit.isBase ? "Base" : "Derivada"}
          </Badge>
          <Badge variant="warning-outlined">{dimensionLabel(unit.dimension)}</Badge>
          <Badge variant={unit.allowDecimals ? "info" : "secondary"}>
            {unit.allowDecimals ? "Decimales" : "Enteros"}
          </Badge>
        </div>
      </div>

      {activeError ? (
        <p className="text-sm text-red-600" role="alert" data-test-id="unit-card-active-error">
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
                const r = await updateUnitActiveAction(unit.id, v);
                if (!r.success) {
                  setActive(prev);
                  setActiveError(r.error);
                } else {
                  await router.refresh();
                }
              })();
            });
          }}
          label="Activa en catálogo"
          labelPosition="right"
          data-test-id="unit-card-active-switch"
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
        title={unit.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar unidad",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "unit-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar unidad",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "unit-card-delete",
          },
        ]}
      />
      <UpdateUnitDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        unit={unit}
        allUnits={allUnits}
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
        title="Eliminar unidad"
        message={
          <>
            ¿Eliminar la unidad <strong className="font-semibold">«{unit.name}»</strong>? Esta acción no se puede
            deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteUnitAction(unit.id);
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
        data-test-id={`${dataTestId ?? "unit-card"}-delete-dialog`}
      />
    </>
  );
}
