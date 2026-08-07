"use client";

import type { PrintAgentCatalogItem } from "./core";
import {
  fulfillmentModeLabel,
  kitchenUnitRequiresPrintBinding,
  type KitchenFulfillmentModeClient,
  type KitchenUnitPrintBindingsMap,
} from "./kitchen-comanda-print";

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
  comandasAliases: string[];
  replicaEnabled: boolean;
  onReplicaEnabledChange: (enabled: boolean) => void;
  replicaUnitIds: string[];
  onReplicaUnitIdsChange: (ids: string[]) => void;
  idPrefix?: string;
  className?: string;
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
  replicaEnabled,
  onReplicaEnabledChange,
  replicaUnitIds,
  onReplicaUnitIdsChange,
  idPrefix = "kitchen-up",
  className = "",
}: Props) {
  const printableUnits = units.filter((u) =>
    kitchenUnitRequiresPrintBinding(u.kitchenFulfillmentMode),
  );

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
                        className="rounded-md border border-border bg-background px-2 py-1.5"
                        value={binding.printerDisplayLabel ?? ""}
                        onChange={(e) =>
                          patchBinding(unit.id, {
                            printerDisplayLabel: e.target.value,
                          })
                        }
                        data-test-id={`${idPrefix}-alias-${unit.id}`}
                      >
                        {aliasOptions(
                          comandasAliases,
                          binding.printerDisplayLabel ?? "",
                        ).map((o) => (
                          <option key={o.value || "__none"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
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

      {printableUnits.length > 0 ? (
        <div className="rounded-lg border border-border/70 p-3">
          <h3 className="text-sm font-semibold text-foreground">
            Réplica en esta caja
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Copia opcional en la impresora de tickets del POS/mesero al enviar a
            cocina.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={replicaEnabled}
              onChange={(e) => onReplicaEnabledChange(e.target.checked)}
              data-test-id={`${idPrefix}-replica-enabled`}
            />
            Réplica local de comanda
          </label>
          {replicaEnabled ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Unidades (vacío = todas las que imprimen comanda)
              </p>
              {printableUnits.map((u) => {
                const explicitlySelected = replicaUnitIds.includes(u.id);
                const checked =
                  replicaUnitIds.length === 0 ? true : explicitlySelected;
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 text-sm"
                    data-test-id={`${idPrefix}-replica-unit-${u.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const on = e.target.checked;
                        onReplicaUnitIdsChange(
                          (() => {
                            if (replicaUnitIds.length === 0) {
                              if (!on) {
                                return printableUnits
                                  .map((x) => x.id)
                                  .filter((id) => id !== u.id);
                              }
                              return replicaUnitIds;
                            }
                            if (on) {
                              const next = [
                                ...new Set([...replicaUnitIds, u.id]),
                              ];
                              if (next.length === printableUnits.length) {
                                return [];
                              }
                              return next;
                            }
                            return replicaUnitIds.filter((id) => id !== u.id);
                          })(),
                        );
                      }}
                    />
                    {u.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
