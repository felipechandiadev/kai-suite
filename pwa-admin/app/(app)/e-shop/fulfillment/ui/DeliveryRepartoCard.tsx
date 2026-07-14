"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { getTodayIso, timeToMinutes } from "@kai/ui";
import type { DeliveryOccurrenceRow } from "@/features/e-shop-delivery/types/delivery.types";
import { zoneColor } from "./delivery-zones-map.constants";

type DeliveryRepartoCardProps = {
  occurrence: DeliveryOccurrenceRow;
  zoneIndexById: Map<string, number>;
  onEdit: (occurrence: DeliveryOccurrenceRow) => void;
  style?: CSSProperties;
};

function isCutoffOpen(occurrenceDate: string, orderCutoffTime: string): boolean {
  const today = getTodayIso();
  if (occurrenceDate < today) return false;
  if (occurrenceDate > today) return true;
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(nowParts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(nowParts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute < timeToMinutes(orderCutoffTime);
}

export function DeliveryRepartoCard({
  occurrence,
  zoneIndexById,
  onEdit,
  style,
}: DeliveryRepartoCardProps) {
  const cutoffOpen = isCutoffOpen(
    occurrence.occurrenceDate,
    occurrence.orderCutoffTime,
  );
  const visibleZones = occurrence.zones.slice(0, 2);
  const extraZones = occurrence.zones.length - visibleZones.length;
  const capacityLabel =
    occurrence.maxOrders != null
      ? `${occurrence.orderCount}/${occurrence.maxOrders}`
      : `${occurrence.orderCount} ped.`;

  return (
    <div
      className={`group relative z-10 min-h-18 rounded-lg border bg-card p-2 shadow-sm transition-all hover:z-20 hover:shadow-md ${
        occurrence.isCancelled
          ? "border-dashed opacity-50"
          : "border-border hover:border-primary/40"
      }`}
      style={style}
      role="gridcell"
      aria-label={`Reparto ${occurrence.departureTime}, ${
        occurrence.zones.map((z) => z.name).join(", ") || "sin zona"
      }, ${occurrence.orderCount} pedidos`}
      data-test-id={`delivery-reparto-${occurrence.id}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tabular-nums text-foreground">
            {occurrence.departureTime}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{occurrence.name}</p>
        </div>
        {!occurrence.isCancelled ? (
          <span
            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
              cutoffOpen ? "bg-emerald-500" : "bg-amber-500"
            }`}
            title={cutoffOpen ? "Cut-off abierto" : "Cut-off cerrado"}
            aria-hidden
          />
        ) : (
          <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase text-muted-foreground">
            Cancelado
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {visibleZones.map((zone) => {
          const idx = zoneIndexById.get(zone.id) ?? 0;
          return (
            <span
              key={zone.id}
              className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: zoneColor(idx) }}
                aria-hidden
              />
              <span className="truncate">{zone.name}</span>
            </span>
          );
        })}
        {extraZones > 0 ? (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            +{extraZones}
          </span>
        ) : null}
        {occurrence.zones.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">Sin zona</span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {capacityLabel}
        </span>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {occurrence.canEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(occurrence);
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Editar
            </button>
          ) : null}
          <Link
            href={`/e-shop/fulfillment/operacion?date=${encodeURIComponent(occurrence.occurrenceDate)}&occurrenceId=${encodeURIComponent(occurrence.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            Operación
          </Link>
        </div>
      </div>
      <p className="mt-1 truncate text-[9px] uppercase tracking-wide text-muted-foreground">
        {occurrence.routeStatus}
      </p>
    </div>
  );
}
