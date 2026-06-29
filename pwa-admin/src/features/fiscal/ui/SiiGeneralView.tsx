"use client";

import Link from "next/link";
import type { FiscalSummary } from "../types/fiscal.types";
import { MILESTONE_LABELS } from "../types/fiscal.types";

type Props = { summary: FiscalSummary };

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    READY: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    CERTIFIED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    PRODUCTION: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return map[status] ?? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

export function SiiGeneralView({ summary }: Props) {
  const envLabel =
    summary.environment === "production" ? "Producción" : "Certificación (apicert/pangal)";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h2 className="font-semibold">Estado</h2>
          <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${statusBadge(summary.status)}`}>
            {summary.status}
          </span>
          <p className="text-sm text-muted-foreground">Ambiente: {envLabel}</p>
          <p className="text-sm text-muted-foreground">
            Emisión producción: {summary.productionEnabled ? "Habilitada" : "Deshabilitada"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h2 className="font-semibold">Hosts SII</h2>
          <p className="text-sm font-mono">API: {summary.hosts.api}</p>
          <p className="text-sm font-mono">Envío: {summary.hosts.envio}</p>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="font-semibold">Progreso certificación</h2>
        <ul className="space-y-2">
          {MILESTONE_LABELS.map(({ key, label }) => {
            const done = summary.milestones[key];
            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${done ? "bg-green-500" : "bg-muted-foreground/40"}`}
                  aria-hidden
                />
                <span className={done ? "" : "text-muted-foreground"}>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/settings/sii/emisor"
          className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-medium">Emisor</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.rut ? `${summary.rut}` : "Completar datos"}
          </p>
        </Link>
        <Link
          href="/settings/sii/credenciales"
          className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-medium">Credenciales</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cert: {summary.hasCertificate ? "Cargado" : "Pendiente"} · CAF:{" "}
            {summary.activeCaf ? `${summary.activeCaf.nextFolio}` : "Pendiente"}
          </p>
        </Link>
        <Link
          href="/settings/sii/certificacion"
          className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-medium">Certificación</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.activeRun?.status ?? "Sin corrida activa"}
          </p>
        </Link>
      </section>
    </div>
  );
}
