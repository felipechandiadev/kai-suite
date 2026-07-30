"use client";

import type { DeliveryCommuneRow, DeliveryZoneRow } from "@/features/e-shop-delivery/types/delivery.types";
import { DeliveryZonesWorkspace } from "./DeliveryZonesWorkspace";

export function DeliveryZonesPanel({
  initialZones,
  communes,
}: {
  initialZones: DeliveryZoneRow[];
  communes: DeliveryCommuneRow[];
}) {
  return <DeliveryZonesWorkspace initialZones={initialZones} communes={communes} />;
}
