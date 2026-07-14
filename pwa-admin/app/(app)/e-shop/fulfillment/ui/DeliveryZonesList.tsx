"use client";

import type { DeliveryZoneRow } from "@/features/e-shop-delivery/types/delivery.types";
import { zoneColor } from "./delivery-zones-map.constants";

type DeliveryZonesListProps = {
  items: DeliveryZoneRow[];
  selectedZoneId: string | null;
  onSelectZone: (zone: DeliveryZoneRow) => void;
};

export function DeliveryZonesList({
  items,
  selectedZoneId,
  onSelectZone,
}: DeliveryZonesListProps) {
  return (
    <div className="flex h-full flex-col gap-3" data-test-id="delivery-zones-list">
      <h3 className="font-medium">Zonas configuradas</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay zonas. Usa “Nueva zona” para crear la primera dibujando un polígono.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((zone, index) => {
            const selected = zone.id === selectedZoneId;
            return (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => onSelectZone(zone)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40"
                  }`}
                  data-test-id={`delivery-zone-item-${zone.id}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: zoneColor(index) }}
                      aria-hidden
                    />
                    <span className="truncate">
                      {zone.name}
                      {!zone.isActive ? " (inactiva)" : ""}
                      {!zone.geometry ? " — sin polígono" : ""}
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 font-medium">
                    ${Number(zone.shippingFee).toLocaleString("es-CL")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
