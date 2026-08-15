"use client";

import { useMemo, useState } from "react";
import {
  applyPrintAgentCatalogItemToStorage,
  type PrintAgentCatalogItem,
  readPrintServiceConfigFromStorage,
} from "./core";
import { resetSharedPrintServiceConnections } from "./connection-manager";

type Props = {
  agents: PrintAgentCatalogItem[];
  loading?: boolean;
  onRefresh?: () => void;
  /** Tras aplicar a localStorage (host/ports). */
  onApplied?: (agent: PrintAgentCatalogItem) => void;
  className?: string;
  "data-test-id"?: string;
};

/**
 * Lista agentes registrados en Kai Core y, al elegir uno, escribe host/puertos en localStorage.
 * La impresión sigue por el WebSocket LAN del agente.
 */
export function PrintAgentPicker({
  agents,
  loading = false,
  onRefresh,
  onApplied,
  className = "",
  "data-test-id": testId,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const selectedId = useMemo(
    () => readPrintServiceConfigFromStorage().agentId,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-eval on agents change
    [agents],
  );

  const select = (agent: PrintAgentCatalogItem) => {
    setError(null);
    try {
      applyPrintAgentCatalogItemToStorage(agent);
      resetSharedPrintServiceConnections();
      onApplied?.(agent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className={`space-y-3 ${className}`} data-test-id={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Agentes de esta empresa</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Solo ves equipos registrados para esta empresa. Al elegir uno, POS/mesero se conectan a
            su IP local. El navegador puede pedir acceso a la red local (LNA).
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs font-medium"
            disabled={loading}
            onClick={onRefresh}
          >
            {loading ? "Actualizando…" : "Actualizar lista"}
          </button>
        ) : null}
      </div>
      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay agentes registrados. Creá uno en Admin y emparejálo desde Kai Printers.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {agents.map((a) => {
            const label = a.lanHost
              ? `${a.displayName} · ${a.lanHost}`
              : `${a.displayName} · sin IP aún`;
            const active = selectedId === a.id;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.online ? "En línea" : "Sin heartbeat reciente"}
                    {a.companyName ? ` · ${a.companyName}` : ""}
                    {a.platform && a.platform !== "unknown" ? ` · ${a.platform}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background"
                  }`}
                  disabled={!a.lanHost}
                  onClick={() => select(a)}
                >
                  {active ? "Seleccionado" : "Usar este"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
