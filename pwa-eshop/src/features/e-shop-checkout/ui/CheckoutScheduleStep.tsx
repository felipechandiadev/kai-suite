"use client";

import { useEffect, useState } from "react";
import { Alert, Button } from "@kai/ui";
import { fetchDeliveryOccurrencesAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliveryOccurrenceOption } from "@/features/e-shop-delivery/types/delivery.types";
import {
  buildThreeDayWindow,
  getSantiagoDateParts,
  isCutoffStillOpen,
} from "@/features/e-shop-checkout/lib/santiago-time";

type Props = {
  zoneId: string | null;
  occurrenceId: string;
  onOccurrenceIdChange: (id: string) => void;
};

export function CheckoutScheduleStep({ zoneId, occurrenceId, onOccurrenceIdChange }: Props) {
  const [slots, setSlots] = useState<DeliveryOccurrenceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setSlots([]);
      onOccurrenceIdChange("");
      setSelectedDay(null);
      return;
    }
    setLoading(true);
    setError(null);
    void fetchDeliveryOccurrencesAction(zoneId)
      .then((rows) => {
        const parts = getSantiagoDateParts();
        const today = parts.date;
        const window = buildThreeDayWindow(today);

        const filtered = rows
          .filter((r) => window.has(r.occurrenceDate))
          .filter((r) => r.occurrenceDate !== today || isCutoffStillOpen(r.orderCutoffTime, parts));

        setSlots(filtered);

        const firstDay = filtered[0]?.occurrenceDate ?? null;
        setSelectedDay(firstDay);

        if (filtered.length > 0 && !filtered.some((r) => r.id === occurrenceId)) {
          onOccurrenceIdChange(filtered[0]?.id ?? "");
        }
      })
      .catch((e) => {
        const message =
          e instanceof Error && e.message.trim()
            ? e.message
            : "No se pudieron cargar franjas de reparto";
        setError(message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  const slotsByDay = selectedDay ? slots.filter((s) => s.occurrenceDate === selectedDay) : slots;
  const availableDays = Array.from(new Set(slots.map((s) => s.occurrenceDate)));
  const today = getSantiagoDateParts().date;

  if (!zoneId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Valida tu dirección para ver franjas disponibles.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando franjas…</p>;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (slots.length === 0) {
    return (
      <Alert variant="warning">
        No hay franjas de reparto disponibles para tu zona en los próximos días. Puedes elegir retiro en
        local.
      </Alert>
    );
  }

  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">Franja de reparto</legend>
      {availableDays.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {availableDays.slice(0, 3).map((d) => {
            const label = d === today ? "Hoy" : d;
            return (
              <Button
                key={d}
                type="button"
                variant={d === selectedDay ? "primary" : "secondary"}
                onClick={() => setSelectedDay(d)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      ) : null}
      {slotsByDay.map((slot) => (
        <label
          key={slot.id}
          className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-checked:border-primary"
        >
          <input
            type="radio"
            name="delivery-slot"
            checked={occurrenceId === slot.id}
            onChange={() => onOccurrenceIdChange(slot.id)}
            className="mt-1"
          />
          <span className="text-sm">
            <span className="font-medium">{slot.name}</span>
            <span className="block text-muted-foreground">
              {slot.occurrenceDate} · salida {slot.departureTime.slice(0, 5)} · corte{" "}
              {slot.orderCutoffTime.slice(0, 5)}
            </span>
            {slot.availableSlots != null ? (
              <span className="text-xs text-muted-foreground">{slot.availableSlots} cupos</span>
            ) : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
