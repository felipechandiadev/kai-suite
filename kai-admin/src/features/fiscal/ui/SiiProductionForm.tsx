"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { FiscalSummary } from "../types/fiscal.types";
import {
  acknowledgePortalCertificationAction,
  enableFiscalProductionAction,
} from "../actions/fiscal.actions";

type Props = { summary: FiscalSummary };

export function SiiProductionForm({ summary }: Props) {
  const router = useRouter();
  const certified = summary.status === "CERTIFIED" || summary.status === "PRODUCTION";
  const hasProdCaf = !!summary.productionCaf;
  const canAcknowledgePortal =
    !certified &&
    summary.milestones.enrolment &&
    summary.hasCertificate &&
    hasProdCaf &&
    !!summary.resolutionNumber;
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
        ? "Emisi?n en producci?n habilitada. El POS sigue emitiendo ticket hasta integraci?n futura."
        : "Producci?n deshabilitada.",
    );
    router.refresh();
  }

  async function onAcknowledgePortal() {
    setBusy(true);
    setError("");
    const res = await acknowledgePortalCertificationAction();
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Certificaci?n registrada. Ya puede habilitar producci?n.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12">
        <h2 className="font-semibold">Ambiente producci?n</h2>
        <p className="text-sm text-muted-foreground">
          Hosts: <span className="font-mono">api.sii.cl</span> /{" "}
          <span className="font-mono">rahue.sii.cl</span>
        </p>
        {!certified ? (
          <div className="space-y-2">
            <p className="text-sm text-amber-600">
              Complete la certificaci?n antes de habilitar producci?n.
            </p>
            {canAcknowledgePortal ? (
              <p className="text-sm text-muted-foreground">
                Si ya complet? el Set de Prueba y la declaraci?n en el portal SII, puede registrarlo
                aqu? sin repetir el env?o desde Kai.
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Requiere CAF de producci?n cargado en Credenciales (ambiente producci?n).
          {hasProdCaf ? (
            <>
              {" "}
              CAF activo: folio {summary.productionCaf!.nextFolio} (rango{" "}
              {summary.productionCaf!.rangeFrom}?{summary.productionCaf!.rangeTo}).
            </>
          ) : (
            <> CAF de producci?n: no cargado.</>
          )}
        </p>
        <Switch
          label="Habilitar emisi?n fiscal en producci?n"
          checked={enabled}
          onChange={setEnabled}
          disabled={!certified}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          {canAcknowledgePortal ? (
            <Button variant="outlined" disabled={busy} onClick={onAcknowledgePortal}>
              Ya certifiqu? en portal SII
            </Button>
          ) : null}
          <Button onClick={onSave} disabled={busy || !certified}>
            {busy ? "Guardando?" : "Guardar"}
          </Button>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
