"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Dialog, LocationPicker, Select, TextField } from "@kai/ui";
import type { Option } from "@kai/ui";
import {
  fetchPosDeliveryCoverageAction,
  fetchPosDeliveryOccurrencesAction,
  fetchPosDeliveryQuoteAction,
  geocodePosDeliveryAddressAction,
  resolvePosDeliveryZoneAction,
} from "../actions/pos-delivery.action";
import type {
  DeliveryOccurrenceOption,
  ResolvedDeliveryZone,
} from "../types/delivery-api.types";
import type { PosDeliveryConfig } from "../types/pos-delivery.types";

const MAULE_DEFAULT = { lat: -35.426, lng: -71.655 };

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatOccurrenceDate(dateYmd: string): string {
  if (!dateYmd) return "";
  return new Date(`${dateYmd}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatOccurrenceTime(time: string): string {
  return time?.slice(0, 5) || time || "";
}

function occurrenceLabel(o: DeliveryOccurrenceOption): string {
  const date = formatOccurrenceDate(o.occurrenceDate);
  const time = formatOccurrenceTime(o.departureTime);
  const slots =
    o.availableSlots != null ? ` · ${o.availableSlots} cupos` : "";
  return `${o.name} · ${date} · ${time}${slots}`;
}

export type PosDeliveryDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: PosDeliveryConfig) => void;
  onClear?: () => void;
  productSubtotal: number;
  initial?: PosDeliveryConfig | null;
  customerHint?: { name?: string | null; phone?: string | null } | null;
};

export function PosDeliveryDialog({
  open,
  onClose,
  onConfirm,
  onClear,
  productSubtotal,
  initial,
  customerHint,
}: PosDeliveryDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localDeliveryEnabled, setLocalDeliveryEnabled] = useState(false);
  const [regionName, setRegionName] = useState("Región del Maule");
  const [communes, setCommunes] = useState<
    Array<{ code: string; name: string; province: string }>
  >([]);
  const [address, setAddress] = useState("");
  const [communeCode, setCommuneCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [zone, setZone] = useState<ResolvedDeliveryZone | null>(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [freeShippingApplied, setFreeShippingApplied] = useState(false);
  const [occurrences, setOccurrences] = useState<DeliveryOccurrenceOption[]>(
    [],
  );
  const [occurrenceId, setOccurrenceId] = useState("");
  const [notes, setNotes] = useState("");

  const communeOptions: Option[] = useMemo(
    () =>
      communes.map((c) => ({
        id: c.code,
        label: `${c.name} (${c.province})`,
      })),
    [communes],
  );

  const selectedCommune = communes.find((c) => c.code === communeCode) ?? null;
  const hasCoords =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  const resetFromInitial = useCallback(() => {
    setError("");
    setBusy(false);
    if (initial) {
      setAddress(initial.address);
      setCommuneCode(initial.communeCode);
      setLatitude(initial.latitude);
      setLongitude(initial.longitude);
      setZone({
        zoneId: initial.deliveryZoneId,
        zoneName: initial.zoneName,
        shippingFee: initial.shippingFee,
        communeCode: initial.communeCode,
      });
      setShippingFee(initial.shippingFee);
      setOccurrenceId(initial.deliveryOccurrenceId);
      setNotes(initial.notes ?? "");
    } else {
      setAddress("");
      setCommuneCode("");
      setLatitude(null);
      setLongitude(null);
      setZone(null);
      setShippingFee(0);
      setFreeShippingApplied(false);
      setOccurrences([]);
      setOccurrenceId("");
      setNotes("");
    }
  }, [initial]);

  useEffect(() => {
    if (!open) return;
    resetFromInitial();
    let cancelled = false;
    void (async () => {
      const res = await fetchPosDeliveryCoverageAction();
      if (cancelled) return;
      if (!res.success) {
        setLocalDeliveryEnabled(false);
        setError(res.message);
        return;
      }
      setLocalDeliveryEnabled(res.data.localDeliveryEnabled === true);
      setRegionName(res.data.regionName || "Región del Maule");
      setCommunes(res.data.communes ?? []);
      if (!res.data.localDeliveryEnabled) {
        setError("El reparto local no está habilitado para esta empresa.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resetFromInitial]);

  useEffect(() => {
    if (!open || !zone?.zoneId) {
      setOccurrences([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [quoteRes, occRes] = await Promise.all([
        fetchPosDeliveryQuoteAction(zone.zoneId, productSubtotal),
        fetchPosDeliveryOccurrencesAction(zone.zoneId),
      ]);
      if (cancelled) return;
      if (quoteRes.success) {
        setShippingFee(quoteRes.data.shippingFee);
        setFreeShippingApplied(quoteRes.data.freeShippingApplied);
      }
      if (occRes.success) {
        setOccurrences(occRes.data);
        setOccurrenceId((prev) =>
          prev && occRes.data.some((o) => o.id === prev) ? prev : "",
        );
      } else {
        setOccurrences([]);
        setError(occRes.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, zone?.zoneId, productSubtotal]);

  const clearResolvedZone = () => {
    setZone(null);
    setOccurrenceId("");
    setFreeShippingApplied(false);
  };

  const validateCoverage = async () => {
    setError("");
    const addr = address.trim();
    if (!addr) {
      setError("Ingresa la dirección de entrega.");
      return;
    }
    if (!communeCode.trim()) {
      setError("Selecciona la comuna.");
      return;
    }
    setBusy(true);
    try {
      let lat = latitude;
      let lng = longitude;
      if (lat == null || lng == null) {
        const geo = await geocodePosDeliveryAddressAction({
          address: addr,
          commune: selectedCommune?.name,
          region: regionName,
        });
        if (!geo.success) {
          setError(geo.message);
          clearResolvedZone();
          return;
        }
        lat = geo.data.latitude;
        lng = geo.data.longitude;
        setLatitude(lat);
        setLongitude(lng);
      }
      const resolved = await resolvePosDeliveryZoneAction({
        latitude: lat,
        longitude: lng,
        communeCode,
        commune: selectedCommune?.name,
      });
      if (!resolved.success) {
        setError(resolved.message);
        clearResolvedZone();
        return;
      }
      if (!resolved.data.covered || !resolved.data.zone) {
        setError("La dirección queda fuera de la zona de cobertura.");
        clearResolvedZone();
        return;
      }
      setZone(resolved.data.zone);
      setOccurrenceId("");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    setError("");
    if (!zone || latitude == null || longitude == null) {
      setError("Valida la cobertura antes de confirmar.");
      return;
    }
    if (!occurrenceId.trim()) {
      setError("Selecciona una franja de reparto.");
      return;
    }
    const occ = occurrences.find((o) => o.id === occurrenceId);
    onConfirm({
      deliveryZoneId: zone.zoneId,
      deliveryOccurrenceId: occurrenceId,
      address: address.trim(),
      communeCode,
      communeName: selectedCommune?.name ?? null,
      region: regionName,
      latitude,
      longitude,
      shippingFee: Math.round(shippingFee),
      zoneName: zone.zoneName,
      occurrenceLabel: occ ? occurrenceLabel(occ) : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reparto local"
      size="lg"
      scroll="paper"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          {initial && onClear ? (
            <Button type="button" variant="outlined" onClick={onClear}>
              Quitar reparto
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outlined" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || !localDeliveryEnabled}
              onClick={handleConfirm}
              data-test-id="pos-delivery-confirm"
            >
              Confirmar
            </Button>
          </div>
        </>
      }
      data-test-id="pos-delivery-dialog"
    >
      <div className="grid gap-3 text-sm">
        {customerHint?.name ? (
          <p className="text-muted-foreground">
            Entrega para{" "}
            <span className="font-medium text-foreground">
              {customerHint.name}
            </span>
            {customerHint.phone ? ` · ${customerHint.phone}` : ""}
          </p>
        ) : null}
        <TextField
          label="Dirección"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            clearResolvedZone();
          }}
          placeholder="Calle y número"
          disabled={busy || !localDeliveryEnabled}
        />
        <Select
          label="Comuna"
          options={communeOptions}
          value={communeCode || null}
          onChange={(id) => {
            setCommuneCode(id == null ? "" : String(id));
            clearResolvedZone();
          }}
          placeholder="Selecciona comuna"
          disabled={busy || !localDeliveryEnabled || communes.length === 0}
        />
        <div className="space-y-2" data-test-id="pos-delivery-location-picker">
          <p className="text-sm font-medium text-foreground">
            Ubicación en el mapa
          </p>
          <p className="text-xs text-muted-foreground">
            Se inicia con tu ubicación. Puedes mover el pin o tocar el mapa para
            ajustar la zona de reparto.
          </p>
          <LocationPicker
            mode={hasCoords ? "update" : "edit"}
            draggable
            height={14}
            initialLat={hasCoords ? latitude! : MAULE_DEFAULT.lat}
            initialLng={hasCoords ? longitude! : MAULE_DEFAULT.lng}
            externalPosition={
              hasCoords ? { lat: latitude!, lng: longitude! } : undefined
            }
            recenterOnExternalChange
            variant="default"
            rounded="md"
            onChange={(coords) => {
              setLatitude(coords?.lat ?? null);
              setLongitude(coords?.lng ?? null);
              clearResolvedZone();
            }}
          />
        </div>
        <Button
          type="button"
          variant="outlined"
          disabled={busy || !localDeliveryEnabled}
          onClick={() => void validateCoverage()}
          data-test-id="pos-delivery-validate"
        >
          {busy ? "Validando…" : "Validar cobertura"}
        </Button>
        {zone ? (
          <Alert variant="success">
            Zona: <strong>{zone.zoneName}</strong>
            {freeShippingApplied
              ? " · envío gratis"
              : shippingFee > 0
                ? ` · ${formatMoney(shippingFee)}`
                : " · sin costo"}
          </Alert>
        ) : null}
        {zone ? (
          <div className="space-y-2" data-test-id="pos-delivery-occurrence-picker">
            <p className="text-sm font-medium text-foreground">
              Franja de reparto
            </p>
            {occurrences.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin franjas disponibles para esta zona.
              </p>
            ) : (
              <div
                className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3"
                role="listbox"
                aria-label="Franjas de reparto"
              >
                {occurrences.map((o) => {
                  const selected = o.id === occurrenceId;
                  const dateLabel = formatOccurrenceDate(o.occurrenceDate);
                  const timeLabel = formatOccurrenceTime(o.departureTime);
                  return (
                    <Card
                      key={o.id}
                      className={[
                        "p-2.5!",
                        selected ? "fs-card--border-secondary bg-secondary/5" : "",
                        busy
                          ? "pointer-events-none opacity-60"
                          : "cursor-pointer hover:border-secondary/60",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (busy) return;
                        setOccurrenceId(o.id);
                        setError("");
                      }}
                      data-test-id={`pos-delivery-occurrence-${o.id}`}
                    >
                      <div
                        className="min-w-0 space-y-0.5"
                        role="option"
                        aria-selected={selected}
                      >
                        <p className="truncate text-sm font-semibold text-foreground">
                          {o.name}
                        </p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {dateLabel}
                        </p>
                        <p className="text-sm font-medium tabular-nums text-foreground">
                          {timeLabel}
                        </p>
                        {o.availableSlots != null ? (
                          <p className="text-[11px] text-muted-foreground">
                            {o.availableSlots} cupos
                          </p>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
        <TextField
          label="Notas al repartidor (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Referencias, timbre, etc."
          disabled={busy || !localDeliveryEnabled}
        />
      </div>
    </Dialog>
  );
}
