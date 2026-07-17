"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  CollectionPageLayout,
  Dialog,
  Select,
  TextField,
} from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import {
  createProductionUnitAction,
  updateProductionUnitAction,
} from "@/features/inventory-production-units/actions/production-unit.action";
import type { ProductionUnitListItem } from "@/features/inventory-production-units/types/production-unit.types";

type Props = {
  initialUnits: ProductionUnitListItem[];
  branches: BranchListItem[];
};

export function ProductionUnitsCollection({ initialUnits, branches }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [units, setUnits] = useState(initialUnits);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionUnitListItem | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q) return units;
    return units.filter(
      (u) =>
        u.code.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q),
    );
  }, [units, q]);

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? id;

  const openCreate = () => {
    setEditing(null);
    setBranchId(branches[0]?.id ?? "");
    setName("");
    setIsActive(true);
    setError(null);
    setOpen(true);
  };

  const openEdit = (unit: ProductionUnitListItem) => {
    setEditing(unit);
    setBranchId(unit.branchId);
    setName(unit.name);
    setIsActive(unit.isActive);
    setError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = editing
      ? await updateProductionUnitAction({
          id: editing.id,
          branchId,
          name: name.trim(),
          isActive,
        })
      : await createProductionUnitAction({
          branchId,
          name: name.trim(),
          isActive: true,
        });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setUnits((prev) => {
      const idx = prev.findIndex((u) => u.id === result.unit.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result.unit;
        return next;
      }
      return [...prev, result.unit];
    });
    setOpen(false);
  };

  return (
    <>
      <CollectionPageLayout
        title="Unidades de producción"
        addAction={
          <Button variant="primary" onClick={openCreate} data-test-id="production-units-new">
            Nueva unidad
          </Button>
        }
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Código o nombre"
        contentEmptyMessage="No hay unidades de producción"
        contentItems={
          filtered.length > 0
            ? filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => openEdit(u)}
                  data-test-id={`production-unit-card-${u.code}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{u.name}</span>
                    <Badge variant={u.isActive ? "success" : "secondary"}>
                      {u.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {u.code} · {branchName(u.branchId)}
                  </p>
                </button>
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar unidad" : "Nueva unidad"}
        data-test-id="production-unit-dialog"
      >
        <div className="flex flex-col gap-3 min-w-[320px]">
          <Select
            label="Sucursal"
            value={branchId}
            onChange={(v) => setBranchId(String(v))}
            options={branches.map((b) => ({ id: b.id, label: b.name }))}
          />
          {editing ? (
            <TextField
              label="Código"
              value={editing.code}
              onChange={() => {}}
              disabled
              alwaysShowLabel
              helperText="Asignado automáticamente por el sistema"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              El código se genera automáticamente al guardar (UPR00001…).
            </p>
          )}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Cocina, Barra, Pastelería"
            data-test-id="production-unit-name"
          />
          {editing ? (
            <Select
              label="Estado"
              value={isActive ? "active" : "inactive"}
              onChange={(v) => setIsActive(String(v) === "active")}
              options={[
                { id: "active", label: "Activa" },
                { id: "inactive", label: "Inactiva" },
              ]}
            />
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={saving || !name.trim() || !branchId}
              onClick={() => void handleSave()}
              data-test-id="production-unit-save"
            >
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
