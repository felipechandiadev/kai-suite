"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import Switch from "@/shared/components/Switch/Switch";
import type { FiscalSummary } from "../types/fiscal.types";
import { enableFiscalProductionAction } from "../actions/fiscal.actions";

type Props = { summary: FiscalSummary };

export function SiiProductionForm({ summary }: Props) {
  const router = useRouter();
  const certified = summary.status === "CERTIFIED" || summary.status === "PRODUCTION";
  const [enabled, setEnabled] = useState(summary.productionEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSave() {
    setBusy(true);
    setError("");
    const res = await enableFiscalProductionAction(enabled, "production");
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage(
      enabled
        ? "Emisión en producción habilitada. El POS sigue emitiendo ticket hasta integración futura."
        : "Producción deshabilitada.",
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12">
        <h2 className="font-semibold">Ambiente producción</h2>
        <p className="text-sm text-muted-foreground">
          Hosts: <span className="font-mono">api.sii.cl</span> /{" "}
          <span className="font-mono">rahue.sii.cl</span>
        </p>
        {!certified ? (
          <p className="text-sm text-amber-600">
            Complete la certificación antes de habilitar producción.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Requiere CAF de producción cargado en Credenciales (ambiente producción).
        </p>
        <Switch
          label="Habilitar emisión fiscal en producción"
          checked={enabled}
          onChange={setEnabled}
          disabled={!certified}
        />
        <div className="absolute bottom-2 right-2">
          <Button onClick={onSave} disabled={busy || !certified}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
