"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField, LocationPicker } from "@kai/ui";
import { updateDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliverySettingsRow } from "@/features/e-shop-delivery/types/delivery.types";

export function DeliveryDepotSettingsPanel({
  initialSettings,
}: {
  initialSettings: DeliverySettingsRow;
}) {
  const router = useRouter();
  const [depotAddress, setDepotAddress] = useState(initialSettings.depotAddress ?? "");
  const [depotLat, setDepotLat] = useState<number | null>(initialSettings.depotLat ?? null);
  const [depotLng, setDepotLng] = useState<number | null>(initialSettings.depotLng ?? null);
  const [osrmUrl, setOsrmUrl] = useState(initialSettings.osrmUrl ?? "");
  const [busy, setBusy] = useState(false);
  const hasCoords =
    typeof depotLat === "number" &&
    typeof depotLng === "number" &&
    !Number.isNaN(depotLat) &&
    !Number.isNaN(depotLng);

  return (
    <form
      className="mx-auto w-full max-w-xl space-y-4 rounded-xl border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void updateDeliverySettingsAction({
          depotAddress: depotAddress || null,
          depotLat,
          depotLng,
          osrmUrl: osrmUrl || null,
        })
          .then(() => router.refresh())
          .finally(() => setBusy(false));
      }}
    >
      <h2 className="font-semibold">Bodega y ruteo (Maule)</h2>
      <Alert variant="info">
        La habilitación de <strong>Reparto local</strong> en checkout se controla en{" "}
        <Link href="/e-shop/fulfillment/metodos" className="underline underline-offset-2">
          Métodos
        </Link>
        . Aquí solo configuras bodega, coordenadas y OSRM.
      </Alert>
      <TextField
        label="Dirección bodega"
        value={depotAddress}
        onChange={(e) => setDepotAddress(e.target.value)}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Ubicación de la bodega (mapa)</p>
        <p className="text-xs text-muted-foreground">
          Indicá en el mapa o arrastrá el marcador. Se guardan latitud y longitud.
        </p>
        <LocationPicker
          mode={hasCoords ? "update" : "edit"}
          externalPosition={hasCoords ? { lat: depotLat!, lng: depotLng! } : undefined}
          initialLat={-35.426}
          initialLng={-71.655}
          height={22}
          variant="default"
          rounded="md"
          onChange={(coords) => {
            if (!coords) {
              setDepotLat(null);
              setDepotLng(null);
              return;
            }
            setDepotLat(coords.lat);
            setDepotLng(coords.lng);
          }}
        />
      </div>
      <TextField
        label="OSRM URL"
        value={osrmUrl}
        onChange={(e) => setOsrmUrl(e.target.value)}
        helperText="Ej: http://localhost:5000"
      />
      <Button type="submit" variant="primary" disabled={busy}>
        Guardar configuración
      </Button>
    </form>
  );
}
