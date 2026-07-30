"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, Layers, Tags } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import { Badge } from "@kai/ui";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { PRICE_LIST_TYPE_OPTIONS } from "@/features/sales-price-lists/types/price-list.types";
import { deletePriceListAction } from "@/features/sales-price-lists/actions/price-list.action";
import { UpdatePriceListDialog } from "./UpdatePriceListDialog";

type PriceListCardProps = {
  priceList: PriceListListItem;
  "data-test-id"?: string;
};

function typeLabel(t: string): string {
  return PRICE_LIST_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t;
}

function formatShortDate(value?: string | Date | null) {
  if (value == null || value === "") {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatValidityLabel(from?: string | Date | null, until?: string | Date | null): string | null {
  const a = formatShortDate(from);
  const b = formatShortDate(until);
  if (a && b) return `${a} — ${b}`;
  if (a) return `Desde ${a}`;
  if (b) return `Hasta ${b}`;
  return null;
}

export function PriceListCard({ priceList, "data-test-id": dataTestId }: PriceListCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const createdLabel = formatShortDate(priceList.createdAt);
  const updatedLabel = formatShortDate(priceList.updatedAt);
  const validityLabel = formatValidityLabel(priceList.validFrom, priceList.validUntil);

  const deleteLocked = priceList.nonDeletable === true;

  const headerEnd = (
    <span data-test-id="price-list-card-active-label" className="flex shrink-0 flex-wrap justify-end gap-1">
      {deleteLocked ? (
        <Badge variant="secondary-outlined" className="text-[10px]">
          Sistema
        </Badge>
      ) : null}
      <Badge variant={priceList.isActive ? "success" : "secondary-outlined"}>
        {priceList.isActive ? "Activa" : "Inactiva"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="price-list-card-media"
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
        <Tags className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="space-y-3" data-test-id="price-list-card-body">
      {priceList.isDefault ? (
        <div className="flex flex-wrap gap-1.5" data-test-id="price-list-card-default-badge">
          <Badge variant="primary">Predeterminada</Badge>
        </div>
      ) : null}

      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Tipo
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="price-list-card-type">
          {typeLabel(priceList.priceListType)}
        </p>
      </div>

      {validityLabel ? (
        <div className="rounded-lg border border-border/60 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Vigencia
          </p>
          <p className="text-sm text-foreground" data-test-id="price-list-card-validity">
            {validityLabel}
          </p>
        </div>
      ) : null}

      {priceList.description?.trim() ? (
        <div className="rounded-lg border border-border/50 bg-neutral/20 px-3 py-2.5">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Descripción
          </p>
          <p className="text-sm leading-snug text-foreground" data-test-id="price-list-card-description">
            {priceList.description.trim()}
          </p>
        </div>
      ) : null}

      {(createdLabel || updatedLabel) && (
        <div
          className="flex flex-wrap items-center gap-1 border-t border-border/70 pt-2.5 text-[0.7rem] text-muted-foreground"
          data-test-id="price-list-card-dates"
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
          {createdLabel ? <span>Creada {createdLabel}</span> : null}
          {updatedLabel && updatedLabel !== createdLabel ? (
            <span>
              {createdLabel ? " · " : null}
              Actualizada {updatedLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Card
          fillHeight
          className="h-full min-h-0 overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
          data-test-id={dataTestId}
          media={media}
          title={priceList.name}
          headerEnd={headerEnd}
          content={content}
          actions={[
            {
              id: "update",
              icon: "Pencil",
              ariaLabel: "Actualizar lista de precio",
              onClick: () => setUpdateOpen(true),
              "data-test-id": "price-list-card-update",
            },
            ...(deleteLocked
              ? []
              : [
                  {
                    id: "delete",
                    icon: "Trash2" as const,
                    ariaLabel: "Eliminar lista de precio",
                    disabled: isDeleting,
                    onClick: () => {
                      setDeleteErrors([]);
                      setDeleteOpen(true);
                    },
                    "data-test-id": "price-list-card-delete",
                  },
                ]),
          ]}
        />
      </div>
      <UpdatePriceListDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        priceList={priceList}
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
        title="Eliminar lista de precio"
        message={
          <>
            ¿Eliminar la lista <strong className="font-semibold">«{priceList.name}»</strong>? Esta acción no se
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
              const r = await deletePriceListAction(priceList.id);
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
        data-test-id={`${dataTestId ?? "price-list-card"}-delete-dialog`}
      />
    </>
  );
}
