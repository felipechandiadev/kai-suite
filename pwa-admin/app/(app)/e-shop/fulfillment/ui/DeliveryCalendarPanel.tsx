"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@kai/ui";
import { createDeliveryOccurrenceAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliveryOccurrenceRow, DeliveryZoneRow } from "@/features/e-shop-delivery/types/delivery.types";

export function DeliveryCalendarPanel({
  initialOccurrences,
  zones,
}: {
  initialOccurrences: DeliveryOccurrenceRow[];
  zones: DeliveryZoneRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("Salida tarde");
  const [occurrenceDate, setOccurrenceDate] = useState("");
  const [departureTime, setDepartureTime] = useState("15:00");
  const [orderCutoffTime, setOrderCutoffTime] = useState("13:00");
  const [maxOrders, setMaxOrders] = useState("20");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void createDeliveryOccurrenceAction({
            name,
            occurrenceDate,
            departureTime,
            orderCutoffTime,
            maxOrders: maxOrders ? Number(maxOrders) : null,
            zoneIds: zoneId ? [zoneId] : [],
          })
            .then(() => router.refresh())
            .finally(() => setBusy(false));
        }}
      >
        <h2 className="font-semibold">Nueva franja de reparto</h2>
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField
          label="Fecha"
          type="date"
          value={occurrenceDate}
          onChange={(e) => setOccurrenceDate(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Hora salida"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
          <TextField
            label="Corte de pedidos"
            type="time"
            value={orderCutoffTime}
            onChange={(e) => setOrderCutoffTime(e.target.value)}
            required
          />
        </div>
        <TextField
          label="Cupos máximos"
          value={maxOrders}
          onChange={(e) => setMaxOrders(e.target.value)}
        />
        <label className="text-sm space-y-1 block">
          <span className="font-medium">Zona atendida</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">Sin zona</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary" disabled={busy}>
          Crear franja
        </Button>
      </form>

      <ul className="space-y-3">
        {initialOccurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay franjas programadas.</p>
        ) : (
          initialOccurrences.map((o) => (
            <li key={o.id} className="rounded-xl border border-border p-4">
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-muted-foreground">
                {o.occurrenceDate} · salida {o.departureTime} · corte {o.orderCutoffTime}
              </p>
              <p className="text-xs text-muted-foreground">
                Estado ruta: {o.routeStatus}
                {o.maxOrders != null ? ` · cupos ${o.maxOrders}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
