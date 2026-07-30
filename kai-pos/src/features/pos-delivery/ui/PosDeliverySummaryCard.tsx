"use client";

import { Card, IconButton } from "@kai/ui";
import type { PosDeliveryConfig } from "../types/pos-delivery.types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export type PosDeliverySummaryCardProps = {
  posDelivery: PosDeliveryConfig | null;
  disabled?: boolean;
  disabledReason?: string;
  onConfigure: () => void;
  className?: string;
  compact?: boolean;
  "data-test-id"?: string;
};

export function PosDeliverySummaryCard({
  posDelivery,
  disabled = false,
  disabledReason,
  onConfigure,
  className = "",
  compact = false,
  "data-test-id": dataTestId = "pos-payment-delivery",
}: PosDeliverySummaryCardProps) {
  const hasDelivery = posDelivery != null;
  const fee = hasDelivery
    ? Math.max(0, Math.round(posDelivery.shippingFee))
    : 0;

  const actionLabel = hasDelivery ? "Editar reparto" : "Definir reparto";
  const actionTitle = disabledReason?.trim() || actionLabel;

  const info = hasDelivery ? (
    <>
      <p className="truncate text-sm font-semibold leading-tight text-foreground">
        <span className="mr-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reparto
        </span>
        {posDelivery.zoneName}
        {fee > 0 ? (
          <span
            className="ml-1.5 font-medium tabular-nums text-foreground"
            data-test-id="pos-payment-delivery-fee-chip"
          >
            {formatMoney(fee)}
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            sin costo
          </span>
        )}
      </p>
      <p
        className="truncate text-xs leading-tight text-muted-foreground"
        title={[posDelivery.address, posDelivery.occurrenceLabel]
          .filter(Boolean)
          .join(" · ")}
      >
        {posDelivery.address}
        {posDelivery.communeName ? ` · ${posDelivery.communeName}` : ""}
        {posDelivery.occurrenceLabel ? ` · ${posDelivery.occurrenceLabel}` : ""}
      </p>
    </>
  ) : (
    <>
      <p className="text-xs font-medium uppercase tracking-wide leading-tight text-muted-foreground">
        Reparto
      </p>
      <p className="truncate text-sm leading-tight text-muted-foreground">
        {disabledReason?.trim() ? disabledReason : "Sin definir"}
      </p>
    </>
  );

  return (
    <Card
      className={[
        "flex items-center gap-2 p-2! py-1.5!",
        compact ? "w-full max-w-56" : "min-w-72 max-w-md flex-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-test-id={dataTestId}
    >
      <div className="min-w-0 flex-1 space-y-0.5">{info}</div>
      <IconButton
        icon="Truck"
        variant={hasDelivery ? "secondary" : "outlined"}
        size={compact ? "sm" : "md"}
        className="shrink-0"
        ariaLabel={actionLabel}
        title={actionTitle}
        disabled={disabled}
        onClick={onConfigure}
        data-test-id={`${dataTestId}-configure`}
      />
    </Card>
  );
}
