"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, Switch, TextField } from "@kai/ui";
import {
  createLaborUnitAction,
  listLaborUnitsAction,
  updateLaborUnitAction,
} from "@/features/hr-labor-units/actions/labor-unit.action";
import type { LaborUnitView } from "@/features/hr-labor-units/types/labor-unit.types";

type Props = {
  initialUnits: LaborUnitView[];
};

function linkChips(
  items: Array<{ id: string; name: string }> | undefined,
  empty = "—",
) {
  if (!items?.length) return empty;
  return items.map((x) => x.name).join(", ");
}

export function LaborUnitsPanel({ initialUnits }: Props) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LaborUnitView | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (includeInactive ? units : units.filter((u) => u.isActive)),
    [includeInactive, units],
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(u: LaborUnitView) {
    setEditing(u);
    setName(u.name);
    setDescription(u.description ?? "");
    setIsActive(u.isActive);
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
    startTransition(async () => {
      if (editing) {
        const res = await updateLaborUnitAction(editing.id, body);
        if (!res.success) {
          setError(res.message);
          return;
        }
      } else {
        const res = await createLaborUnitAction(body);
        if (!res.success) {
          setError(res.message);
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
          Maestro independiente de unidades laborales. Las asociaciones con
          sucursales, almacenes, UO y UP se editan desde esas pantallas.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            Incluir inactivas
          </label>
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
                  <div>
                    UO:{" "}
                    {u.organizationalUnitIds?.length
                      ? `${u.organizationalUnitIds.length}`
                      : "—"}{" "}
                    · UP:{" "}
                    {u.productionUnitIds?.length
                      ? `${u.productionUnitIds.length}`
                      : "—"}
                  </div>
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
                    Editar
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
        title={editing ? "Editar unidad laboral" : "Nueva unidad laboral"}
      >
        <div className="flex w-full min-w-0 flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {editing ? (
            <TextField label="Código" value={editing.code} disabled />
          ) : null}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {editing ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Vínculos (solo lectura)</p>
              <p>Sucursales: {linkChips(editing.branches)}</p>
              <p>Almacenes: {linkChips(editing.storages)}</p>
              <p>
                UO: {editing.organizationalUnitIds?.length ?? 0} · UP:{" "}
                {editing.productionUnitIds?.length ?? 0}
              </p>
              <p>Editá asociaciones desde sucursal, bodega, UO o UP.</p>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onChange={setIsActive} />
            <span className="text-sm">Activa</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
