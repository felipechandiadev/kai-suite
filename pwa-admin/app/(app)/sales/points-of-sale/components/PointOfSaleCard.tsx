"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, Cpu, Package, Store, Tags } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import { Badge } from "@kai/ui";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import { deletePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { getPosPaymentMethodsForCardAction } from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";
import type { PosPaymentMethodDisplayBadge } from "@/features/sales-points-of-sale/types/pos-payment-methods.types";

type PointOfSaleCardProps = {
  point: PointOfSaleListItem;
  "data-test-id"?: string;
};

function maskDeviceId(value: string): string {
  const v = value.trim();
  if (v.length <= 10) return v;
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export function PointOfSaleCard({
  point,
  "data-test-id": dataTestId,
}: PointOfSaleCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const listCount = point.priceLists?.length ?? 0;

  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [paymentBadges, setPaymentBadges] = useState<PosPaymentMethodDisplayBadge[]>([]);

  const reloadPaymentMethods = useCallback(async () => {
    setPmLoading(true);
    setPmError(null);
    try {
      const res = await getPosPaymentMethodsForCardAction(point.id);
      if (res.success) {
        setPaymentBadges(res.badges);
      } else {
        setPaymentBadges([]);
        setPmError(res.error || "No se pudieron cargar los medios de pago");
      }
    } finally {
      setPmLoading(false);
    }
  }, [point.id]);

  useEffect(() => {
    void reloadPaymentMethods();
  }, [point.id, point.updatedAt, reloadPaymentMethods]);

  const headerEnd = (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5" data-test-id="pos-card-active-label">
      <Badge variant={(point.kind ?? "SALE") === "PRESALE" ? "warning-outlined" : "info-outlined"}>
        {(point.kind ?? "SALE") === "PRESALE" ? "Preventa" : "Caja"}
      </Badge>
      {(point.kind ?? "SALE") === "SALE" && point.acceptsPresaleTickets ? (
        <Badge variant="secondary-outlined">Tickets preventa</Badge>
      ) : null}
      <Badge variant={point.isActive ? "success" : "secondary-outlined"}>
        {point.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="pos-card-media"
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
        <Store className="h-9 w-9 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="space-y-3" data-test-id="pos-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Sucursal
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="pos-card-branch">
          {point.branch?.name ?? "—"}
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Package className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Sala de venta
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="pos-card-storage">
          {point.storage?.name ?? "—"}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Cpu className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Dispositivo
        </p>
        {point.deviceId && String(point.deviceId).trim() ? (
          <div className="flex flex-wrap items-center gap-2">
            <span title={String(point.deviceId).trim()}>
              <Badge
                variant="secondary-outlined"
                className="font-mono text-xs"
                data-test-id="pos-card-device"
              >
                {maskDeviceId(String(point.deviceId))}
              </Badge>
            </span>
            <span className="text-xs text-muted-foreground">
              Identificador del terminal
            </span>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No asignado</p>
        )}
      </div>

      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
            <CreditCard
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            Medios de pago
          </p>
        </div>

        {pmLoading ? (
          <LoadingState className="flex items-center justify-center py-4" data-test-id="pos-card-payment-methods-loading" />
        ) : pmError ? (
          <p
            className="text-sm text-error"
            data-test-id="pos-card-payment-methods-error"
          >
            {pmError}
          </p>
        ) : paymentBadges.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-test-id="pos-card-payment-methods-empty"
          >
            No configurados
          </p>
        ) : (
          <div
            className="flex flex-wrap gap-1.5"
            data-test-id="pos-card-payment-methods-badges"
          >
            {paymentBadges.slice(0, 6).map((m) => (
              <span
                key={m.companyPaymentMethodId}
                title={m.label}
                className="inline-block max-w-full"
              >
                <Badge variant="info-outlined" className="max-w-full truncate">
                  {m.alias?.trim() || m.label}
                </Badge>
              </span>
            ))}
            {paymentBadges.length > 6 ? (
              <Badge variant="secondary-outlined">
                +{paymentBadges.length - 6}
              </Badge>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Listas de precio
        </p>
        {listCount === 0 ? (
          <p className="text-sm text-muted-foreground" data-test-id="pos-card-lists-empty">
            Ninguna lista asignada
          </p>
        ) : (
          <div
            className="flex flex-wrap gap-1.5"
            data-test-id="pos-card-price-list-badges"
          >
            {point.priceLists.map((pl) => {
              const isPreferente = pl.id === point.defaultPriceListId;
              return (
                <span key={pl.id} title={pl.name} className="inline-block max-w-full">
                  <Badge
                    variant={isPreferente ? "primary" : "info-outlined"}
                    className="max-w-full truncate"
                  >
                    {isPreferente ? "★ " : ""}
                    {pl.name}
                    {!pl.isActive ? " · inactiva" : ""}
                  </Badge>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card
        className="overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={point.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar punto de venta",
            onClick: () => {
              router.push(`/sales/points-of-sale/${point.id}`);
            },
            "data-test-id": "pos-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar punto de venta",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "pos-card-delete",
          },
        ]}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar punto de venta"
        message={
          <>
            ¿Eliminar el punto de venta <strong className="font-semibold">«{point.name}»</strong>? Esta
            acción no se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deletePointOfSaleAction(point.id);
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
        data-test-id={`${dataTestId ?? "pos-card"}-delete-dialog`}
      />
    </>
  );
}
