"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, IconButton, Switch } from "@kai/ui";
import {
  getVariantBranchAvailabilityAction,
  saveVariantBranchAvailabilityAction,
} from "@/features/inventory-products/actions/variant-production.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

type Props = {
  variantId: string;
};

export function VariantDetailBranchAvailabilitySection({ variantId }: Props) {
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [activeByBranchId, setActiveByBranchId] = useState<Record<string, boolean>>(
    {},
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      listBranchesForSettingsPage(),
      getVariantBranchAvailabilityAction(variantId),
    ])
      .then(([branchList, availability]) => {
        if (cancelled) return;
        setBranches(branchList);
        const availMap = new Map(
          availability.map((a) => [a.branchId, a.isActive !== false]),
        );
        const next: Record<string, boolean> = {};
        for (const branch of branchList) {
          next[branch.id] = availMap.has(branch.id)
            ? availMap.get(branch.id) === true
            : true;
        }
        setActiveByBranchId(next);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "No se pudo cargar sucursales",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  const setActiveInBranch = (branchId: string, isActive: boolean) => {
    setSaveOk(false);
    setActiveByBranchId((prev) => ({ ...prev, [branchId]: isActive }));
  };

  const handleSave = () => {
    setSaveError(null);
    setSaveOk(false);
    const items = branches.map((branch) => ({
      branchId: branch.id,
      isActive: activeByBranchId[branch.id] !== false,
    }));

    startTransition(() => {
      void saveVariantBranchAvailabilityAction(variantId, items).then((res) => {
        if (!res.success) {
          setSaveError(res.message);
          return;
        }
        setSaveOk(true);
      });
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando sucursales…</p>;
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border p-4"
      data-test-id="variant-detail-branch-availability"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sucursales</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Definí en qué sucursales se puede vender esta variante en POS y mesero.
            La variante también debe estar activa globalmente (pestaña Identidad).
            Sin configuración explícita, queda disponible en todas las sucursales.
          </p>
        </div>
        <IconButton
          icon="Save"
          variant="primary"
          size="md"
          ariaLabel={pending ? "Guardando" : "Guardar sucursales"}
          title={pending ? "Guardando…" : "Guardar"}
          disabled={pending}
          isLoading={pending}
          onClick={handleSave}
          data-test-id="variant-detail-branch-availability-save"
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
      {saveOk ? (
        <Alert variant="success" className="text-sm">
          Disponibilidad por sucursal guardada.
        </Alert>
      ) : null}

      {branches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay sucursales activas en esta empresa.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2"
              data-test-id={`pv-branch-row-${branch.id}`}
            >
              <span className="text-sm font-medium text-foreground">
                {branch.name}
              </span>
              <Switch
                label="Activa en esta sucursal"
                labelPosition="left"
                checked={activeByBranchId[branch.id] !== false}
                onChange={(v) => setActiveInBranch(branch.id, v)}
                disabled={pending}
                density="compact"
                data-test-id={`pv-branch-active-${branch.id}`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
