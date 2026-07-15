"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, Select } from "@kai/ui";
import type {
  DeliveryDriverRow,
  DeliveryOccurrenceRow,
  DeliveryOperationsOccurrence,
} from "@/features/e-shop-delivery/types/delivery.types";
import { CALENDAR_ROUTE } from "./operations-board-params";
import { OperationsChip } from "./OperationsChip";
import { isCutoffOpen, totalOrderCount } from "./operations.utils";

const ROUTE_STATUS_LABELS: Record<string, string> = {
  planned: "Planificado",
  route_ready: "Ruta lista",
  out: "En ruta",
  completed: "Completado",
  cancelled: "Cancelado",
};

function routeStatusLabel(status: string): string {
  return ROUTE_STATUS_LABELS[status] ?? status;
}

const STARTABLE_ROUTE_STATUSES = ["planned", "route_ready"];

type OperationsRepartoCarouselProps = {
  repartos: DeliveryOccurrenceRow[];
  activeOccurrenceId?: string | null;
  activeOccurrence?: DeliveryOperationsOccurrence | null;
  drivers: DeliveryDriverRow[];
  pending?: boolean;
  disabled?: boolean;
  onSelect: (occurrenceId: string) => void;
  onDriverChange: (driverUserId: string | null) => void;
  onOptimizeRoute: () => void;
};

export function OperationsRepartoCarousel({
  repartos,
  activeOccurrenceId,
  activeOccurrence,
  drivers,
  pending = false,
  disabled = false,
  onSelect,
  onDriverChange,
  onOptimizeRoute,
}: OperationsRepartoCarouselProps) {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const activeRepartos = repartos.filter((reparto) => !reparto.isCancelled);

  const driverOptions = drivers.map((driver) => ({
    id: driver.id,
    label: `${driver.displayName} (${driver.login})`,
  }));

  const driverLabelById = new Map(
    drivers.map((driver) => [driver.id, driver.displayName]),
  );

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeOccurrenceId, activeRepartos.length]);

  if (activeRepartos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        No hay repartos programados para este día.{" "}
        <Link href={CALENDAR_ROUTE} className="text-primary hover:underline">
          Ir al calendario
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Repartos del día"
    >
      {activeRepartos.map((reparto) => {
        const isActive = reparto.id === activeOccurrenceId;
        const useRich = isActive && activeOccurrence?.id === reparto.id;

        const routeStatus = useRich
          ? activeOccurrence!.routeStatus
          : reparto.routeStatus;
        const driverUserId = useRich
          ? activeOccurrence!.driverUserId
          : reparto.driverUserId;
        const driverLabel = useRich
          ? activeOccurrence!.driverLabel
          : driverUserId
            ? (driverLabelById.get(driverUserId) ?? null)
            : null;
        const zones = useRich ? activeOccurrence!.zones : reparto.zones;
        const totalDistanceM = useRich ? activeOccurrence!.totalDistanceM : null;
        const totalDurationS = useRich ? activeOccurrence!.totalDurationS : null;

        const orderTotal = useRich
          ? totalOrderCount(activeOccurrence!.orderCounts)
          : reparto.orderCount;
        const cutoffOpen = isCutoffOpen(
          reparto.occurrenceDate,
          reparto.orderCutoffTime,
        );
        const visibleZones = zones.slice(0, 3);
        const extraZones = zones.length - visibleZones.length;
        const canOptimize = STARTABLE_ROUTE_STATUSES.includes(routeStatus);

        if (isActive) {
          return (
            <div
              key={reparto.id}
              ref={activeCardRef}
              role="tab"
              aria-selected
              className="min-w-[min(92vw,32rem)] max-w-[36rem] shrink-0 snap-center rounded-xl border-2 border-primary bg-card p-4 text-left shadow-sm"
              data-test-id={`operations-reparto-card-${reparto.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {reparto.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Salida {reparto.departureTime} · Cut-off{" "}
                    {reparto.orderCutoffTime}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      cutoffOpen ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    title={cutoffOpen ? "Cut-off abierto" : "Cut-off cerrado"}
                    aria-hidden
                  />
                  <OperationsChip variant="info">
                    {routeStatusLabel(routeStatus)}
                  </OperationsChip>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {visibleZones.map((zone) => (
                  <span
                    key={zone.id}
                    className="truncate rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                  >
                    {zone.name}
                  </span>
                ))}
                {extraZones > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    +{extraZones}
                  </span>
                ) : null}
                {orderTotal > 0 ? (
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-white">
                    {orderTotal} ped.
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Sin pedidos
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Select
                  label="Repartidor"
                  options={driverOptions}
                  value={driverUserId}
                  onChange={(id) => onDriverChange(id != null ? String(id) : null)}
                  density="compact"
                  placeholder="Sin asignar"
                  allowClear
                  disabled={pending || routeStatus === "out"}
                />
                <div className="flex flex-wrap gap-2">
                  {canOptimize ? (
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      disabled={pending}
                      onClick={onOptimizeRoute}
                    >
                      Optimizar ruta
                    </Button>
                  ) : null}
                </div>
              </div>

              {totalDistanceM != null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ruta: {(totalDistanceM / 1000).toFixed(1)} km
                  {totalDurationS != null
                    ? ` · ~${Math.round(totalDurationS / 60)} min`
                    : ""}
                </p>
              ) : null}
            </div>
          );
        }

        return (
          <button
            key={reparto.id}
            type="button"
            role="tab"
            aria-selected={false}
            disabled={disabled}
            onClick={() => onSelect(reparto.id)}
            className="min-w-[11.5rem] max-w-[14rem] shrink-0 snap-start rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-50"
            data-test-id={`operations-reparto-card-${reparto.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {reparto.name}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {reparto.departureTime}
                </p>
              </div>
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  cutoffOpen ? "bg-emerald-500" : "bg-amber-500"
                }`}
                title={cutoffOpen ? "Cut-off abierto" : "Cut-off cerrado"}
                aria-hidden
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {reparto.zones.slice(0, 2).map((zone) => (
                <span
                  key={zone.id}
                  className="truncate rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                >
                  {zone.name}
                </span>
              ))}
              {reparto.zones.length > 2 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  +{reparto.zones.length - 2}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              {driverLabel ? (
                <span className="truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {driverLabel}
                </span>
              ) : null}
              <OperationsChip variant="default" className="!text-[10px]">
                {routeStatusLabel(routeStatus)}
              </OperationsChip>
              {orderTotal > 0 ? (
                <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-white">
                  {orderTotal} ped.
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
