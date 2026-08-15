"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import {
  fetchAliasesByPurposeFromAgent,
  type PrintAgentCatalogItem,
} from "./core";
import {
  fulfillmentModeLabel,
  kitchenUnitRequiresPrintBinding,
  type KitchenFulfillmentModeClient,
  type KitchenUnitPrintBindingsMap,
} from "./kitchen-comanda-print";
import { printKitchenComandaTest } from "./kitchen-comanda-test-print";

export type KitchenUnitPrintBindingsRow = {
  id: string;
  name: string;
  kitchenFulfillmentMode: KitchenFulfillmentModeClient;
};

type Props = {
  units: KitchenUnitPrintBindingsRow[];
  bindings: KitchenUnitPrintBindingsMap;
  onBindingsChange: (next: KitchenUnitPrintBindingsMap) => void;
  agents: PrintAgentCatalogItem[];
  catalogLoading?: boolean;
  onRefreshCatalog?: () => void;
  /** Alias de comandas del agente de conexión local (Predeterminado). */
  comandasAliases: string[];
  /** Incrementar para volver a pedir alias a los agentes de las UP. */
  aliasesRefreshNonce?: number;
  /** Solo POS: checkbox de réplica en cada UP imprimible. */
  showReplica?: boolean;
  replicaUnitIds?: string[];
  onReplicaUnitIdsChange?: (ids: string[]) => void;
  idPrefix?: string;
  className?: string;
  testPrintCompanyName?: string | null;
  testPrintSourceApp?: string;
};

function aliasOptions(aliases: string[], current: string) {
  const options: { value: string; label: string }[] = [
    { value: "", label: "Ninguna" },
  ];
  const seen = new Set<string>();
  if (current && !aliases.includes(current)) {
    options.push({ value: current, label: current });
    seen.add(current);
  }
  for (const a of aliases) {
    if (seen.has(a)) continue;
    seen.add(a);
    options.push({ value: a, label: a });
  }
  return options;
}

export function KitchenUnitPrintBindingsSection({
  units,
  bindings,
  onBindingsChange,
  agents,
  catalogLoading = false,
  onRefreshCatalog,
  comandasAliases,
  aliasesRefreshNonce = 0,
  showReplica = false,
  replicaUnitIds = [],
  onReplicaUnitIdsChange,
  idPrefix = "kitchen-up",
  className = "",
  testPrintCompanyName,
  testPrintSourceApp = "kai",
}: Props) {
  const boundAgentIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const u of units) {
      if (!kitchenUnitRequiresPrintBinding(u.kitchenFulfillmentMode)) continue;
      const id = bindings[u.id]?.printAgentId?.trim();
      if (id) ids.add(id);
    }
    return [...ids].sort().join("\0");
  }, [units, bindings]);

  const [aliasesByAgentId, setAliasesByAgentId] = useState<Record<string, string[]>>(
    {},
  );
  const [loadingByAgentId, setLoadingByAgentId] = useState<Record<string, boolean>>(
    {},
  );
  const [errorByAgentId, setErrorByAgentId] = useState<Record<string, string>>(
    {},
  );
  const [testBusyUnitId, setTestBusyUnitId] = useState<string | null>(null);
  const [testErrorByUnitId, setTestErrorByUnitId] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const boundAgentIds = boundAgentIdsKey ? boundAgentIdsKey.split("\0") : [];
    if (boundAgentIds.length === 0) return;
    let cancelled = false;
    for (const agentId of boundAgentIds) {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent?.lanHost?.trim()) {
        setLoadingByAgentId((p) => ({ ...p, [agentId]: false }));
        setErrorByAgentId((p) => ({
          ...p,
          [agentId]: "El agente aún no reportó IP LAN (esperá un heartbeat)",
        }));
        setAliasesByAgentId((p) => ({ ...p, [agentId]: [] }));
        continue;
      }
      setLoadingByAgentId((p) => ({ ...p, [agentId]: true }));
      setErrorByAgentId((p) => {
        const next = { ...p };
        delete next[agentId];
        return next;
      });
      void fetchAliasesByPurposeFromAgent(agent, {
        clientId: "kai-kitchen-aliases",
        appLabel: "Impresión comandas",
      })
        .then((aliases) => {
          if (cancelled) return;
          setAliasesByAgentId((p) => ({ ...p, [agentId]: aliases.comandas }));
          setLoadingByAgentId((p) => ({ ...p, [agentId]: false }));
        })
        .catch((e) => {
          if (cancelled) return;
          setAliasesByAgentId((p) => ({ ...p, [agentId]: [] }));
          setLoadingByAgentId((p) => ({ ...p, [agentId]: false }));
          setErrorByAgentId((p) => ({
            ...p,
            [agentId]: e instanceof Error ? e.message : String(e),
          }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [boundAgentIdsKey, agents, aliasesRefreshNonce]);

  const patchBinding = (
    unitId: string,
    patch: Partial<{ printAgentId: string; printerDisplayLabel: string }>,
  ) => {
    const prev = bindings[unitId] ?? {};
    const next: KitchenUnitPrintBindingsMap = { ...bindings };
    const merged = {
      printAgentId:
        patch.printAgentId !== undefined
          ? patch.printAgentId.trim() || null
          : prev.printAgentId ?? null,
      printerDisplayLabel:
        patch.printerDisplayLabel !== undefined
          ? patch.printerDisplayLabel.trim() || null
          : prev.printerDisplayLabel ?? null,
    };
    if (!merged.printAgentId && !merged.printerDisplayLabel) {
      delete next[unitId];
    } else {
      next[unitId] = merged;
    }
    onBindingsChange(next);
  };

  const runTestPrint = async (unitId: string, unitName: string) => {
    const binding = bindings[unitId] ?? {};
    const agentId = binding.printAgentId?.trim() || "";
    const agent = agentId ? agents.find((a) => a.id === agentId) ?? null : null;
    if (agentId && !agent?.lanHost?.trim()) {
      setTestErrorByUnitId((p) => ({
        ...p,
        [unitId]: "El agente aún no reportó IP LAN (esperá un heartbeat)",
      }));
      return;
    }
    setTestBusyUnitId(unitId);
    setTestErrorByUnitId((p) => {
      const next = { ...p };
      delete next[unitId];
      return next;
    });
    try {
      await printKitchenComandaTest({
        productionUnitName: unitName,
        agent,
        printerDisplayLabel: binding.printerDisplayLabel,
        companyName: testPrintCompanyName ?? agent?.companyName,
        sourceApp: testPrintSourceApp,
      });
    } catch (e) {
      setTestErrorByUnitId((p) => ({
        ...p,
        [unitId]: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      setTestBusyUnitId(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Comandas por unidad de producción
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El modo operativo (KDS / impresa) se define en Admin. Aquí configurás
            agente e impresora de comandas por UP cuando corresponde.
          </p>
        </div>
        {onRefreshCatalog ? (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            disabled={catalogLoading}
            onClick={() => onRefreshCatalog()}
            data-test-id={`${idPrefix}-refresh-catalog`}
          >
            {catalogLoading ? "Actualizando…" : "Actualizar agentes"}
          </button>
        ) : null}
      </div>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay unidades de cocina activas en esta sucursal.
        </p>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => {
            const requiresPrint = kitchenUnitRequiresPrintBinding(
              unit.kitchenFulfillmentMode,
            );
            const binding = bindings[unit.id] ?? {};
            const modeLabel = fulfillmentModeLabel(unit.kitchenFulfillmentMode);
            const agentId = binding.printAgentId?.trim() || "";
            const boundAgent = agentId
              ? agents.find((a) => a.id === agentId) ?? null
              : null;
            const usingLocal = !agentId;
            const aliases = usingLocal
              ? comandasAliases
              : (aliasesByAgentId[agentId] ?? []);
            const aliasLoading = Boolean(agentId && loadingByAgentId[agentId]);
            const aliasError = agentId ? errorByAgentId[agentId] : null;
            const noLan = Boolean(agentId && !boundAgent?.lanHost?.trim());
            return (
              <div
                key={unit.id}
                className="rounded-lg border border-border/70 p-3"
                data-test-id={`${idPrefix}-card-${unit.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {unit.name}
                  </span>
                  <span
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    data-test-id={`${idPrefix}-mode-${unit.id}`}
                  >
                    {modeLabel}
                  </span>
                  {requiresPrint ? (
                    <IconButton
                      type="button"
                      icon="Printer"
                      variant="action"
                      size="sm"
                      className="ml-auto"
                      disabled={aliasLoading || noLan || testBusyUnitId === unit.id}
                      isLoading={testBusyUnitId === unit.id}
                      ariaLabel={`Imprimir comanda de prueba en ${unit.name}`}
                      title="Imprimir comanda de prueba"
                      data-test-id={`${idPrefix}-test-print-${unit.id}`}
                      onClick={() => void runTestPrint(unit.id, unit.name)}
                    />
                  ) : null}
                </div>
                {requiresPrint ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">Agente Kai Printers</span>
                      <select
                        className="rounded-md border border-border bg-background px-2 py-1.5"
                        value={binding.printAgentId ?? ""}
                        onChange={(e) =>
                          patchBinding(unit.id, { printAgentId: e.target.value })
                        }
                        data-test-id={`${idPrefix}-agent-${unit.id}`}
                      >
                        <option value="">Predeterminado local</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.displayName}
                            {a.online === false ? " (offline)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">
                        Impresora comandas (alias)
                      </span>
                      <select
                        className="rounded-md border border-border bg-background px-2 py-1.5 disabled:opacity-50"
                        value={binding.printerDisplayLabel ?? ""}
                        disabled={aliasLoading || noLan}
                        onChange={(e) =>
                          patchBinding(unit.id, {
                            printerDisplayLabel: e.target.value,
                          })
                        }
                        data-test-id={`${idPrefix}-alias-${unit.id}`}
                      >
                        {aliasLoading ? (
                          <option value={binding.printerDisplayLabel ?? ""}>
                            Cargando impresoras…
                          </option>
                        ) : (
                          aliasOptions(
                            aliases,
                            binding.printerDisplayLabel ?? "",
                          ).map((o) => (
                            <option key={o.value || "__none"} value={o.value}>
                              {o.label}
                            </option>
                          ))
                        )}
                      </select>
                      {aliasError ? (
                        <span
                          className="text-xs text-destructive"
                          data-test-id={`${idPrefix}-alias-error-${unit.id}`}
                        >
                          {aliasError}
                        </span>
                      ) : null}
                    </label>
                    {testErrorByUnitId[unit.id] ? (
                      <p
                        className="text-xs text-destructive sm:col-span-2"
                        data-test-id={`${idPrefix}-test-error-${unit.id}`}
                      >
                        {testErrorByUnitId[unit.id]}
                      </p>
                    ) : null}
                    {showReplica && onReplicaUnitIdsChange ? (
                      <label
                        className="flex items-center gap-2 text-sm sm:col-span-2"
                        data-test-id={`${idPrefix}-replica-${unit.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={replicaUnitIds.includes(unit.id)}
                          onChange={(e) => {
                            const on = e.target.checked;
                            if (on) {
                              onReplicaUnitIdsChange([
                                ...new Set([...replicaUnitIds, unit.id]),
                              ]);
                            } else {
                              onReplicaUnitIdsChange(
                                replicaUnitIds.filter((id) => id !== unit.id),
                              );
                            }
                          }}
                        />
                        Réplica en esta caja
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Esta unidad solo usa pantalla KDS; no requiere impresora de
                    comanda.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
