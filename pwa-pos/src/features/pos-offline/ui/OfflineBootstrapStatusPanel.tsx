"use client";

import { Button } from "@/shared/admin-shared";
import type { OfflineBootstrapStatus } from "../hooks/use-offline-bootstrap";

type Props = {
  status: OfflineBootstrapStatus;
  loading?: boolean;
  onRetry?: () => void;
};

function line(
  label: string,
  state: OfflineBootstrapStatus["fiscal"],
  message?: string,
  extra?: string,
) {
  const stateLabel =
    state === "ok"
      ? "Listo"
      : state === "error"
        ? "Error"
        : state === "loading"
          ? "Descargando…"
          : "Pendiente";
  return (
    <li className="text-sm">
      <span className="font-medium">{label}:</span> {stateLabel}
      {extra ? <span className="text-muted-foreground"> — {extra}</span> : null}
      {message ? <p className="text-xs text-destructive mt-0.5">{message}</p> : null}
    </li>
  );
}

export function OfflineBootstrapStatusPanel({ status, loading, onRetry }: Props) {
  const hasError = status.fiscal === "error" || status.catalog === "error";
  const busy = loading || status.fiscal === "loading" || status.catalog === "loading";

  if (status.fiscal === "idle" && status.catalog === "idle") return null;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-2">
      <p className="text-sm font-medium">Preparación modo offline</p>
      <ul className="flex flex-col gap-1">
        {line("Paquete fiscal (folios)", status.fiscal, status.fiscalMessage)}
        {line(
          "Catálogo local",
          status.catalog,
          status.catalogMessage,
          status.catalogTotal != null ? `${status.catalogTotal} productos` : undefined,
        )}
      </ul>
      {hasError && onRetry ? (
        <Button type="button" variant="outline" size="sm" className="self-start" disabled={busy} onClick={onRetry}>
          Reintentar descarga
        </Button>
      ) : null}
    </div>
  );
}
