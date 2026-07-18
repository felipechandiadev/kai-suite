"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, IconButton, Switch } from "@kai/ui";
import {
  getVariantBranchAvailabilityAction,
  getVariantProductionRoutingAction,
  saveVariantBranchAvailabilityAction,
  saveVariantProductionRoutingAction,
} from "@/features/inventory-products/actions/variant-production.action";
import { listProductionUnitsForPage } from "@/features/inventory-production-units/actions/production-unit.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { ProductionUnitListItem } from "@/features/inventory-production-units/types/production-unit.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { VariantDetailCtpBlock } from "./VariantDetailCtpBlock";

type BranchRoutingState = {
  unitIds: Set<string>;
  defaultUnitId: string | null;
  isActiveInBranch: boolean;
  expanded: boolean;
};

type Props = {
  variantId: string;
};

export function VariantDetailProductionSection({ variantId }: Props) {
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [units, setUnits] = useState<ProductionUnitListItem[]>([]);
  const [byBranch, setByBranch] = useState<Record<string, BranchRoutingState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const branchUnits = useMemo(
    () => units.filter((u) => u.scope === "BRANCH" && u.isActive),
    [units],
  );
  const companyUnits = useMemo(
    () => units.filter((u) => u.scope === "COMPANY" && u.isActive),
    [units],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      listBranchesForSettingsPage(),
      listProductionUnitsForPage(),
      getVariantProductionRoutingAction(variantId),
      getVariantBranchAvailabilityAction(variantId),
    ]).then(([branchList, unitList, routing, availability]) => {
      if (cancelled) return;
      setBranches(branchList);
      setUnits(unitList);
      const availMap = new Map(
        availability.map((a) => [a.branchId, a.isActive !== false]),
      );
      const next: Record<string, BranchRoutingState> = {};
      for (const b of branchList) {
        const rows = routing.filter((r) => r.branchId === b.id);
        const defaultRow = rows.find((r) => r.isDefault);
        next[b.id] = {
          unitIds: new Set(rows.map((r) => r.productionUnitId)),
          defaultUnitId: defaultRow?.productionUnitId ?? null,
          isActiveInBranch: availMap.has(b.id) ? availMap.get(b.id) === true : true,
          expanded: false,
        };
      }
      setByBranch(next);
      setLoading(false);
    }).catch((e) => {
      if (cancelled) return;
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar producción");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  const toggleExpand = (branchId: string) => {
    setByBranch((prev) => {
      const cur = prev[branchId];
      if (!cur) return prev;
      return { ...prev, [branchId]: { ...cur, expanded: !cur.expanded } };
    });
  };

  const toggleUnit = (branchId: string, unitId: string) => {
    setByBranch((prev) => {
      const cur = prev[branchId];
      if (!cur) return prev;
      const unitIds = new Set(cur.unitIds);
      if (unitIds.has(unitId)) {
        unitIds.delete(unitId);
        const defaultUnitId =
          cur.defaultUnitId === unitId
            ? (unitIds.values().next().value as string | undefined) ?? null
            : cur.defaultUnitId;
        return { ...prev, [branchId]: { ...cur, unitIds, defaultUnitId } };
      }
      unitIds.add(unitId);
      const defaultUnitId = cur.defaultUnitId ?? unitId;
      return { ...prev, [branchId]: { ...cur, unitIds, defaultUnitId } };
    });
  };

  const setDefault = (branchId: string, unitId: string) => {
    setByBranch((prev) => {
      const cur = prev[branchId];
      if (!cur || !cur.unitIds.has(unitId)) return prev;
      return { ...prev, [branchId]: { ...cur, defaultUnitId: unitId } };
    });
  };

  const setActiveInBranch = (branchId: string, isActive: boolean) => {
    setByBranch((prev) => {
      const cur = prev[branchId];
      if (!cur) return prev;
      return { ...prev, [branchId]: { ...cur, isActiveInBranch: isActive } };
    });
  };

  const handleSave = () => {
    setSaveError(null);
    const routingItems: Array<{
      branchId: string;
      productionUnitId: string;
      isDefault: boolean;
    }> = [];
    const availabilityItems: Array<{ branchId: string; isActive: boolean }> = [];

    for (const branch of branches) {
      const state = byBranch[branch.id];
      if (!state) continue;
      availabilityItems.push({
        branchId: branch.id,
        isActive: state.isActiveInBranch,
      });
      if (state.unitIds.size === 0) continue;
      if (!state.defaultUnitId || !state.unitIds.has(state.defaultUnitId)) {
        setSaveError(
          `Sucursal «${branch.name}»: marque una unidad por defecto.`,
        );
        return;
      }
      for (const unitId of state.unitIds) {
        routingItems.push({
          branchId: branch.id,
          productionUnitId: unitId,
          isDefault: unitId === state.defaultUnitId,
        });
      }
    }

    startTransition(() => {
      void Promise.all([
        saveVariantProductionRoutingAction(variantId, routingItems),
        saveVariantBranchAvailabilityAction(variantId, availabilityItems),
      ]).then(([routingRes, availRes]) => {
        if (!routingRes.success) {
          setSaveError(routingRes.message);
          return;
        }
        if (!availRes.success) {
          setSaveError(availRes.message);
          return;
        }
      });
    });
  };

  const renderUnitRow = (branchId: string, unit: ProductionUnitListItem) => {
    const state = byBranch[branchId];
    if (!state) return null;
    const checked = state.unitIds.has(unit.id);
    const isDefault = state.defaultUnitId === unit.id;
    return (
      <div
        key={unit.id}
        className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleUnit(branchId, unit.id)}
            disabled={pending}
            data-test-id={`pv-prod-unit-${branchId}-${unit.id}`}
          />
          <span className="truncate">
            {unit.name}
            <span className="text-muted-foreground"> · {unit.code}</span>
          </span>
        </label>
        {checked ? (
          <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <input
              type="radio"
              name={`default-${branchId}`}
              checked={isDefault}
              onChange={() => setDefault(branchId, unit.id)}
              disabled={pending}
              data-test-id={`pv-prod-default-${branchId}-${unit.id}`}
            />
            Default
          </label>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando producción…</p>;
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border p-4"
      data-test-id="variant-detail-production"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Producción</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Unidades de producción por sucursal (KDS / planta). Una default por sucursal.
            Las unidades de empresa se asignan dentro de cada sucursal.
          </p>
        </div>
        <IconButton
          icon="Save"
          variant="primary"
          size="md"
          ariaLabel={pending ? "Guardando" : "Guardar producción"}
          title={pending ? "Guardando…" : "Guardar"}
          disabled={pending}
          isLoading={pending}
          onClick={handleSave}
          data-test-id="variant-detail-production-save"
        />
      </div>

      {loadError ? (
        <Alert variant="error" className="text-sm">
          {loadError}
        </Alert>
      ) : null}
      {saveError ? (
        <Alert variant="error" className="text-sm">
          {saveError}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        {branches.map((branch) => {
          const state = byBranch[branch.id];
          if (!state) return null;
          const localUnits = branchUnits.filter((u) => u.branchId === branch.id);
          return (
            <div
              key={branch.id}
              className="rounded-lg border border-border bg-muted/10"
              data-test-id={`pv-prod-branch-${branch.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  className="text-left text-sm font-medium text-foreground"
                  onClick={() => toggleExpand(branch.id)}
                  aria-expanded={state.expanded}
                >
                  {state.expanded ? "▾" : "▸"} {branch.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {state.unitIds.size} unidad(es)
                  </span>
                </button>
                <Switch
                  label="Activo en sucursal"
                  labelPosition="left"
                  checked={state.isActiveInBranch}
                  onChange={(v) => setActiveInBranch(branch.id, v)}
                  disabled={pending}
                  density="compact"
                  data-test-id={`pv-prod-active-${branch.id}`}
                />
              </div>
              {state.expanded ? (
                <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Unidades de la sucursal
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {localUnits.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No hay unidades de esta sucursal.
                        </p>
                      ) : (
                        localUnits.map((u) => renderUnitRow(branch.id, u))
                      )}
                    </div>
                  </div>
                  {companyUnits.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Unidades de empresa (sin sucursal)
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {companyUnits.map((u) => renderUnitRow(branch.id, u))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {companyUnits.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-3">
          <p className="text-xs text-muted-foreground">
            Unidades sin sucursal ({companyUnits.map((u) => u.name).join(", ")}):
            asigne dentro de cada sucursal expandida para definir en qué locales se usan.
          </p>
        </div>
      ) : null}

      <VariantDetailCtpBlock variantId={variantId} />
    </section>
  );
}
