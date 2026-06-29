"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";
import type { EmisorFormValues } from "../types/fiscal.types";
import { updateFiscalEmisorAction } from "../actions/fiscal.actions";

type Props = { initial: EmisorFormValues };

export function SiiEmisorForm({ initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof EmisorFormValues>(key: K, val: EmisorFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setSaved(false);
  };

  async function onSave() {
    setBusy(true);
    setError("");
    const res = await updateFiscalEmisorAction(values);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">Contribuyente</h2>
        <TextField label="RUT" value={values.rut} onChange={(e) => set("rut", e.target.value)} />
        <TextField
          label="Razón social"
          value={values.legalName}
          onChange={(e) => set("legalName", e.target.value)}
        />
        <TextField
          label="Giro / actividad"
          value={values.businessActivity}
          onChange={(e) => set("businessActivity", e.target.value)}
        />
        <TextField
          label="Dirección"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Comuna"
            value={values.commune}
            onChange={(e) => set("commune", e.target.value)}
          />
          <TextField
            label="Ciudad"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">Resolución boletas</h2>
        <TextField
          label="Número resolución"
          value={values.resolutionNumber}
          onChange={(e) => set("resolutionNumber", e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Fecha resolución</span>
          <input
            type="date"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={values.resolutionDate}
            onChange={(e) => set("resolutionDate", e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">Portal SII (checklist manual)</h2>
        <Switch
          label="Postulación completada en portal"
          checked={values.portalPostulationDone}
          onChange={(v) => set("portalPostulationDone", v)}
        />
        <Switch
          label="Permisos / autorización portal"
          checked={values.portalPermissionsDone}
          onChange={(v) => set("portalPermissionsDone", v)}
        />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-green-600">Guardado correctamente.</p> : null}

      <Button onClick={onSave} disabled={busy}>
        {busy ? "Guardando…" : "Guardar emisor"}
      </Button>
    </div>
  );
}
