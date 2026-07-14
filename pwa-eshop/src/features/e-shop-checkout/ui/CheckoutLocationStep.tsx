"use client";

import { useEffect, useState } from "react";
import { Alert, Button, LocationPicker, TextField } from "@kai/ui";
import {
  fetchDeliveryCoverageAction,
  geocodeDeliveryAddressAction,
  resolveDeliveryZoneAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import type { ResolvedDeliveryZone } from "@/features/e-shop-delivery/types/delivery.types";

export type CheckoutLocationState = {
  address: string;
  commune: string;
  communeCode: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  zone: ResolvedDeliveryZone | null;
  covered: boolean;
};

type Props = {
  value: CheckoutLocationState;
  onChange: (next: CheckoutLocationState) => void;
};

export function CheckoutLocationStep({ value, onChange }: Props) {
  const [communes, setCommunes] = useState<Array<{ code: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchDeliveryCoverageAction()
      .then((c) => setCommunes(c.communes))
      .catch(() => setError("No se pudo cargar cobertura de reparto"));
  }, []);

  async function validateLocation() {
    setError(null);
    if (!value.address.trim() || !value.communeCode) {
      setError("Ingresa dirección y comuna");
      return;
    }
    setBusy(true);
    try {
      let latitude = value.latitude;
      let longitude = value.longitude;
      if (latitude == null || longitude == null) {
        const geo = await geocodeDeliveryAddressAction({
          address: value.address,
          commune: value.commune,
          region: value.region || "Región del Maule",
        });
        latitude = geo.latitude;
        longitude = geo.longitude;
      }
      const resolved = await resolveDeliveryZoneAction({
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        communeCode: value.communeCode,
        commune: value.commune,
      });
      onChange({
        ...value,
        latitude,
        longitude,
        zone: resolved.zone,
        covered: resolved.covered,
      });
      if (!resolved.covered) {
        setError("Tu dirección está fuera de nuestra zona de reparto. Puedes elegir retiro en local.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo validar la dirección");
      onChange({ ...value, zone: null, covered: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Ubicación de entrega (Región del Maule)</p>
      <TextField
        label="Dirección"
        value={value.address}
        onChange={(e) =>
          onChange({
            ...value,
            address: e.target.value,
            zone: null,
            covered: false,
            latitude: null,
            longitude: null,
          })
        }
        required
      />
      <label className="text-sm space-y-1 block">
        <span className="font-medium">Comuna</span>
        <select
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          value={value.communeCode}
          onChange={(e) => {
            const selected = communes.find((c) => c.code === e.target.value);
            onChange({
              ...value,
              communeCode: e.target.value,
              commune: selected?.name ?? "",
              zone: null,
              covered: false,
              latitude: null,
              longitude: null,
            });
          }}
          required
        >
          <option value="">Selecciona comuna</option>
          {communes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label="Región"
        value={value.region || "Región del Maule"}
        onChange={(e) => onChange({ ...value, region: e.target.value })}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setError(null);
          if (!navigator.geolocation) {
            setError("Tu navegador no soporta geolocalización");
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              onChange({
                ...value,
                latitude: lat,
                longitude: lng,
                zone: null,
                covered: false,
              });
            },
            (e) => {
              const code = (e as GeolocationPositionError).code;
              if (code === 1) {
                setError("Permiso de ubicación denegado. Actívalo en el navegador o marca el pin en el mapa.");
              } else if (code === 3) {
                setError("Tiempo de espera agotado al obtener tu ubicación. Intenta de nuevo.");
              } else {
                setError(e.message || "No se pudo obtener tu ubicación");
              }
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        }}
      >
        Usar mi ubicación
      </Button>
      <div className="aspect-video w-full">
        <LocationPicker
          fillContainer
          mode="update"
          draggable
          initialLat={value.latitude ?? -35.426}
          initialLng={value.longitude ?? -71.655}
          externalPosition={
            value.latitude != null && value.longitude != null
              ? { lat: value.latitude, lng: value.longitude }
              : undefined
          }
          recenterOnExternalChange
          onChange={(coords) => {
            onChange({
              ...value,
              latitude: coords?.lat ?? null,
              longitude: coords?.lng ?? null,
              zone: null,
              covered: false,
            });
          }}
        />
      </div>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void validateLocation()}>
        {busy ? "Validando…" : "Validar cobertura"}
      </Button>
      {value.zone ? (
        <Alert variant="success">
          Zona: <strong>{value.zone.zoneName}</strong>
          {value.zone.shippingFee > 0
            ? ` · envío desde $${value.zone.shippingFee.toLocaleString("es-CL")}`
            : " · envío sin costo base"}
        </Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}

export function createEmptyLocationState(): CheckoutLocationState {
  return {
    address: "",
    commune: "",
    communeCode: "",
    region: "Región del Maule",
    latitude: null,
    longitude: null,
    zone: null,
    covered: false,
  };
}
