"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import Switch from "@/shared/components/Switch/Switch";
import type { FiscalSummary } from "../types/fiscal.types";
import {
  completeCertificationAction,
  createCertificationRunAction,
  generateCertificationSetAction,
  queryCertificationStatusAction,
  sendCertificationBoletasAction,
  sendCertificationRcoAction,
} from "../actions/fiscal.actions";

type Props = { summary: FiscalSummary };

function formatMoney(n: number) {
  return n.toLocaleString("es-CL");
}

export function SiiCertificationWizard({ summary }: Props) {
  const router = useRouter();
  const run = summary.activeRun;
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [portalValidated, setPortalValidated] = useState(false);
  const [portalDeclaration, setPortalDeclaration] = useState(false);

  const prereqsOk =
    summary.milestones.enrolment &&
    summary.hasCertificate &&
    !!summary.activeCaf &&
    summary.rut &&
    summary.resolutionNumber;

  async function runAction(
    key: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setBusy(key);
    setError("");
    const res = await fn();
    setBusy("");
    if (!res.success) {
      setError(res.error ?? "Error");
      return;
    }
    router.refresh();
  }

  const preview = run?.generatedPreview ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="font-semibold">Prerrequisitos</h2>
        <ul className="text-sm space-y-1">
          <li className={summary.milestones.enrolment ? "text-green-600" : "text-muted-foreground"}>
            Portal: postulación y permisos
          </li>
          <li className={summary.hasCertificate ? "text-green-600" : "text-muted-foreground"}>
            Certificado digital cargado
          </li>
          <li className={summary.activeCaf ? "text-green-600" : "text-muted-foreground"}>
            CAF certificación activo
            {summary.activeCaf
              ? ` (folio ${summary.activeCaf.nextFolio}, rango ${summary.activeCaf.rangeFrom}-${summary.activeCaf.rangeTo})`
              : ""}
          </li>
          <li className={summary.resolutionNumber ? "text-green-600" : "text-muted-foreground"}>
            Emisor y resolución completos
          </li>
        </ul>
        {!prereqsOk ? (
          <p className="text-sm text-amber-600">
            Complete emisor, credenciales y checklist portal antes de certificar.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="font-semibold">Paso A — Nueva certificación</h2>
        <p className="text-sm text-muted-foreground">
          Inicia una corrida nueva. La corrida anterior en borrador se archiva como rechazada.
        </p>
        <Button
          disabled={!prereqsOk || busy !== ""}
          onClick={() => runAction("create", createCertificationRunAction)}
        >
          {busy === "create" ? "Creando…" : "Nueva certificación"}
        </Button>
        {run ? (
          <p className="text-sm">
            Corrida activa: <code className="text-xs">{run.id}</code> · estado {run.status}
          </p>
        ) : null}
      </section>

      {run ? (
        <>
          <section className="rounded-lg border border-border p-4 space-y-3">
            <h2 className="font-semibold">Paso B — Generar set BE (5 boletas)</h2>
            <Button
              disabled={busy !== ""}
              onClick={() => runAction("generate", () => generateCertificationSetAction(run.id))}
            >
              {busy === "generate" ? "Generando…" : "Generar set"}
            </Button>
            {preview.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3">Caso</th>
                      <th className="py-2 pr-3">Folio</th>
                      <th className="py-2 pr-3">Neto</th>
                      <th className="py-2 pr-3">Exento</th>
                      <th className="py-2 pr-3">IVA</th>
                      <th className="py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.caso} className="border-b border-border/60">
                        <td className="py-2 pr-3">{row.caso}</td>
                        <td className="py-2 pr-3">{row.folio}</td>
                        <td className="py-2 pr-3">{formatMoney(row.mntNeto)}</td>
                        <td className="py-2 pr-3">{formatMoney(row.mntExe)}</td>
                        <td className="py-2 pr-3">{formatMoney(row.iva)}</td>
                        <td className="py-2">{formatMoney(row.mntTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border p-4 space-y-3">
            <h2 className="font-semibold">Paso C — Envío boletas y RCO</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy !== "" || preview.length === 0}
                onClick={() =>
                  runAction("boletas", () => sendCertificationBoletasAction(run.id))
                }
              >
                {busy === "boletas" ? "Enviando…" : "Enviar boletas"}
              </Button>
              <Button
                variant="secondary"
                disabled={busy !== "" || preview.length === 0}
                onClick={() => runAction("rco", () => sendCertificationRcoAction(run.id))}
              >
                {busy === "rco" ? "Enviando…" : "Enviar RCO"}
              </Button>
            </div>
            {run.boletaTrackId ? (
              <p className="text-sm">
                Track ID boletas:{" "}
                <code className="select-all text-xs bg-muted px-1 rounded">{run.boletaTrackId}</code>
              </p>
            ) : null}
            {run.rcoTrackId ? (
              <p className="text-sm">
                Track ID RCO:{" "}
                <code className="select-all text-xs bg-muted px-1 rounded">{run.rcoTrackId}</code>
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border p-4 space-y-3">
            <h2 className="font-semibold">Paso D — Consulta estado SII</h2>
            <p className="text-sm text-muted-foreground">
              Espere ~10 minutos tras el envío antes de consultar. Estado actual:{" "}
              <strong>{run.boletaEnvioStatus ?? "—"}</strong>
            </p>
            <Button
              disabled={busy !== "" || !run.boletaTrackId}
              onClick={() =>
                runAction("status", () => queryCertificationStatusAction(run.id))
              }
            >
              {busy === "status" ? "Consultando…" : "Consultar estado"}
            </Button>
          </section>

          <section className="rounded-lg border border-border p-4 space-y-3">
            <h2 className="font-semibold">Cierre — Marcar certificación completada</h2>
            <Switch
              label="Validación del set confirmada en portal SII"
              checked={portalValidated}
              onChange={setPortalValidated}
            />
            <Switch
              label="Declaración de cumplimiento en portal"
              checked={portalDeclaration}
              onChange={setPortalDeclaration}
            />
            <Button
              disabled={busy !== "" || !portalValidated || !portalDeclaration}
              onClick={() =>
                runAction("complete", () =>
                  completeCertificationAction(run.id, portalValidated, portalDeclaration),
                )
              }
            >
              {busy === "complete" ? "Guardando…" : "Marcar certificación completada"}
            </Button>
          </section>
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
