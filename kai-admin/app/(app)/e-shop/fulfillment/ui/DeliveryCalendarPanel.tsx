"use client";

import type {
  DeliveryOccurrenceRow,
  DeliveryZoneRow,
} from "@/features/e-shop-delivery/types/delivery.types";
import { DeliveryCalendarWorkspace } from "./DeliveryCalendarWorkspace";

export function DeliveryCalendarPanel({
  initialOccurrences,
  zones,
  initialWeekStart,
}: {
  initialOccurrences: DeliveryOccurrenceRow[];
  zones: DeliveryZoneRow[];
  initialWeekStart: string;
}) {
  return (
    <DeliveryCalendarWorkspace
      initialOccurrences={initialOccurrences}
      zones={zones}
      initialWeekStart={initialWeekStart}
    />
  );
}
