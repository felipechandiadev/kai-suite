"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, Select, Switch, TextField } from "@kai/ui";
import {
  createLaborUnitAction,
  listLaborUnitsAction,
  setLaborUnitAssociationsAction,
  updateLaborUnitAction,
} from "@/features/hr-labor-units/actions/labor-unit.action";
import { IdListAssociationsField } from "@/features/hr-labor-units/ui/IdListAssociationsField";
import type {
  LaborUnitNamedOption,
  LaborUnitView,
} from "@/features/hr-labor-units/types/labor-unit.types";

type Props = {
  initialUnits: LaborUnitView[];
  branches: LaborUnitNamedOption[];
  storages: LaborUnitNamedOption[];
  organizationalUnits: LaborUnitNamedOption[];
  productionUnits: LaborUnitNamedOption[];
};

function linkChips(
  items: Array<{ id: string; name: string }> | undefined,
  empty = "—",
) {
  if (!items?.length) return empty;
  return items.map((x) => x.name).join(", ");
}

export function LaborUnitsPanel({
  initialUnits,
  branches,
  storages,
  organizationalUnits,
  productionUnits,
}: Props) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LaborUnitView | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [storageIds, setStorageIds] = useState<string[]>([]);
  const [organizationalUnitIds, setOrganizationalUnitIds] = useState<string[]>([]);
  const [productionUnitId, setProductionUnitId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (includeInactive ? units : units.filter((u) => u.isActive)),
    [includeInactive, units],
  );

  function resetAssociations() {
    setBranchIds([]);
    setStorageIds([]);
    setOrganizationalUnitIds([]);
    setProductionUnitId("");
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    resetAssociations();
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(u: LaborUnitView) {
    setEditing(u);
    setName(u.name);
    setDescription(u.description ?? "");
    setIsActive(u.isActive);
    setBranchIds(u.branchIds ?? u.branches.map((b) => b.id));
    setStorageIds(u.storageIds ?? u.storages.map((s) => s.id));
    setOrganizationalUnitIds(
      u.organizationalUnitIds ?? u.organizationalUnits.map((o) => o.id),
    );
    setProductionUnitId(u.productionUnitIds[0] ?? u.productionUnits[0]?.id ?? "");
    setError(null);
    setDialogOpen(true);
  }

  function reload() {
    startTransition(async () => {
      const res = await listLaborUnitsAction({ includeInactive: true });
      if (res.success) setUnits(res.data);
      router.refresh();
    });
  }

  function save() {
    if (!name.trim()) {
      setError("Nombre requerido");
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      isActive,
    };
    const associations = {
      branchIds,
      storageIds,
      organizationalUnitIds,
      productionUnitIds: productionUnitId ? [productionUnitId] : [],
    };
    startTransition(async () => {
      if (editing) {
        const res = await updateLaborUnitAction(editing.id, body);
        if (!res.success) {
          setError(res.message);
          return;
        }
        const assoc = await setLaborUnitAssociationsAction(editing.id, associations);
        if (!assoc.success) {
          setError(assoc.message);
          return;
        }
      } else {
        const res = await createLaborUnitAction(body);
        if (!res.success) {
          setError(res.message);
          return;
        }
        const assoc = await setLaborUnitAssociationsAction(res.data.id, associations);
        if (!assoc.success) {
          setError(assoc.message);
          return;
        }
      }
      setDialogOpen(false);
      reload();
    });
  }

  return (
    <div className="space-y-4" data-test-id="hcm-labor-units-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Maestro de unidades laborales. Las asociaciones con sucursales, almacenes,
          UO y UP se pueden editar aquí o desde esas pantallas.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={includeInactive}
            onChange={setIncludeInactive}
            label="Incluir inactivas"
            labelPosition="right"
          />
          <Button type="button" onClick={openCreate}>
            Nueva unidad laboral
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Vínculos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-mono text-xs">{u.code}</td>
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  <div>Suc: {linkChips(u.branches)}</div>
                  <div>Alm: {linkChips(u.storages)}</div>
                  <div>UO: {linkChips(u.organizationalUnits)}</div>
                  <div>UP: {linkChips(u.productionUnits)}</div>
                </td>
                <td className="px-3 py-2">
                  {u.isActive ? "Activa" : "Inactiva"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(u)}
                  >
                    Actualizar
                  </Button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No hay unidades laborales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Actualizar unidad laboral" : "Crear unidad laboral"}
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 800px)"
        data-test-id="hcm-labor-unit-dialog"
        alertArea={
          error ? (
            <Alert variant="error" data-test-id="hcm-labor-unit-dialog-error">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-4">
          {editing ? (
            <TextField
              label="Código"
              placeholder="Código"
              value={editing.code}
              disabled
            />
          ) : null}
          <TextField
            label="Nombre"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Descripción"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activa"
            labelPosition="right"
          />
          <IdListAssociationsField
            label="Sucursales"
            addLabel="Agregar sucursal"
            addAriaLabel="Agregar sucursal"
            emptyAvailableLabel="Sin más sucursales"
            options={branches}
            value={branchIds}
            onChange={setBranchIds}
            disabled={pending}
            testId="labor-unit-branches"
          />
          <IdListAssociationsField
            label="Almacenes"
            addLabel="Agregar almacén"
            addAriaLabel="Agregar almacén"
            emptyAvailableLabel="Sin más almacenes"
            options={storages}
            value={storageIds}
            onChange={setStorageIds}
            disabled={pending}
            testId="labor-unit-storages"
          />
          <IdListAssociationsField
            label="Unidades organizativas"
            addLabel="Agregar unidad organizativa"
            addAriaLabel="Agregar unidad organizativa"
            emptyAvailableLabel="Sin más UO"
            options={organizationalUnits}
            value={organizationalUnitIds}
            onChange={setOrganizationalUnitIds}
            disabled={pending}
            testId="labor-unit-org-units"
          />
          <Select
            label="Unidad de producción"
            value={productionUnitId}
            onChange={(v) => setProductionUnitId(v != null ? String(v) : "")}
            disabled={pending}
            options={[
              { id: "", label: "Ninguna" },
              ...productionUnits.map((o) => ({
                id: o.id,
                label: o.code ? `${o.code} · ${o.name}` : o.name,
              })),
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Una unidad laboral puede pertenecer a una sola unidad de producción.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
