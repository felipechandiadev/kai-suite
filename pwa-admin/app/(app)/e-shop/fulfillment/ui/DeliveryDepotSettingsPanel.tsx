"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField } from "@kai/ui";
import { updateDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type { DeliverySettingsRow } from "@/features/e-shop-delivery/types/delivery.types";

export function DeliveryDepotSettingsPanel({
  initialSettings,
}: {
  initialSettings: DeliverySettingsRow;
}) {
  const router = useRouter();
  const [depotAddress, setDepotAddress] = useState(initialSettings.depotAddress ?? "");
  const [depotLat, setDepotLat] = useState(String(initialSettings.depotLat ?? ""));
  const [depotLng, setDepotLng] = useState(String(initialSettings.depotLng ?? ""));
  const [osrmUrl, setOsrmUrl] = useState(initialSettings.osrmUrl ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto w-full max-w-xl space-y-4 rounded-xl border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void updateDeliverySettingsAction({
          depotAddress: depotAddress || null,
          depotLat: depotLat ? Number(depotLat) : null,
          depotLng: depotLng ? Number(depotLng) : null,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Latitud" value={depotLat} onChange={(e) => setDepotLat(e.target.value)} />
        <TextField label="Longitud" value={depotLng} onChange={(e) => setDepotLng(e.target.value)} />
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
