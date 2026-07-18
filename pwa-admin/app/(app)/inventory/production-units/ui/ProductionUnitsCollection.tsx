"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import {
  storageCategoryLabel,
  storageTypeLabel,
} from "@/features/inventory-storages/types/storage.types";
import {
  CreateStorageDialog,
  type CreateStorageDialogPresets,
} from "../../storages/components/CreateStorageDialog";
import {
  createProductionUnitAction,
  updateProductionUnitAction,
} from "@/features/inventory-production-units/actions/production-unit.action";
import type {
  ProductionUnitInventoryMode,
  ProductionUnitListItem,
  ProductionUnitScope,
} from "@/features/inventory-production-units/types/production-unit.types";

type Props = {
  initialUnits: ProductionUnitListItem[];
  branches: BranchListItem[];
  storages: StorageListItem[];
};

const CREATE_STORAGE_OPTION_ID = "__create_storage__";

type CreateStorageTarget = "input" | "output";

function formatStorageOptionLabel(s: StorageListItem): string {
  const parts = [s.name];
  if (s.branch?.name) parts.push(s.branch.name);
  parts.push(storageCategoryLabel(s.category));
  parts.push(storageTypeLabel(s.type));
  return parts.join(" · ");
}

export function ProductionUnitsCollection({
  initialUnits,
  branches,
  storages: initialStorages,
}: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [units, setUnits] = useState(initialUnits);
  const [storages, setStorages] = useState(initialStorages);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionUnitListItem | null>(null);
  const [scope, setScope] = useState<ProductionUnitScope>("BRANCH");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [inventoryMode, setInventoryMode] =
    useState<ProductionUnitInventoryMode>("DEPENDENT");
  const [inputStorageId, setInputStorageId] = useState<string>("");
  const [outputStorageId, setOutputStorageId] = useState<string>("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createStorageOpen, setCreateStorageOpen] = useState(false);
  const [createStorageTarget, setCreateStorageTarget] =
    useState<CreateStorageTarget>("input");

  const filtered = useMemo(() => {
    if (!q) return units;
    return units.filter(
      (u) =>
        u.code.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q),
    );
  }, [units, q]);

  const branchName = (id: string | null) => {
    if (!id) return "Empresa (sin sucursal)";
    return branches.find((b) => b.id === id)?.name ?? id;
  };

  const storageName = (id: string | null | undefined) => {
    if (!id) return null;
    return storages.find((s) => s.id === id)?.name ?? null;
  };

  const storagesForScope = useMemo(() => {
    const active = storages.filter((s) => s.isActive);
    if (scope === "BRANCH" && branchId) {
      return active.filter((s) => !s.branchId || s.branchId === branchId);
    }
    if (scope === "COMPANY") {
      return active.filter((s) => !s.branchId);
    }
    return active;
  }, [storages, scope, branchId]);

  const inputCandidates = useMemo(() => {
    return storagesForScope.filter((s) => {
      if (inventoryMode === "AUTONOMOUS") {
        if (s.category !== "PRODUCTION_INPUT") return false;
        if (s.productionUnitId && s.productionUnitId !== editing?.id) {
          return false;
        }
        return true;
      }
      return s.category !== "PRODUCTION_INPUT";
    });
  }, [storagesForScope, inventoryMode, editing?.id]);

  const outputCandidates = useMemo(
    () => storagesForScope.filter((s) => s.category !== "PRODUCTION_INPUT"),
    [storagesForScope],
  );

  const createOption = {
    id: CREATE_STORAGE_OPTION_ID,
    label: "+ Crear almacén…",
  };

  const inputOptions = useMemo(
    () => [
      ...inputCandidates.map((s) => ({
        id: s.id,
        label: formatStorageOptionLabel(s),
      })),
      createOption,
    ],
    [inputCandidates],
  );

  const outputOptions = useMemo(
    () => [
      ...outputCandidates.map((s) => ({
        id: s.id,
        label: formatStorageOptionLabel(s),
      })),
      createOption,
    ],
    [outputCandidates],
  );

  const defaultSharedStorageId = () => {
    const preferred = outputCandidates.find((s) => s.isDefault);
    return preferred?.id ?? outputCandidates[0]?.id ?? "";
  };

  const suggestedInputStorageName = (unitName: string) => {
    const base = unitName.trim() || "Unidad";
    return `${base} · Insumos`;
  };

  // Clear invalid selections when scope / mode / branch / list change
  useEffect(() => {
    if (!open) return;
    if (
      inputStorageId &&
      !inputCandidates.some((s) => s.id === inputStorageId)
    ) {
      setInputStorageId("");
    }
    if (
      outputStorageId &&
      !outputCandidates.some((s) => s.id === outputStorageId)
    ) {
      setOutputStorageId("");
    }
  }, [open, inputCandidates, outputCandidates, inputStorageId, outputStorageId]);

  const resetDialogFields = (mode: ProductionUnitInventoryMode = "DEPENDENT") => {
    const shared = (() => {
      const preferred = storages
        .filter((s) => s.isActive && s.category !== "PRODUCTION_INPUT")
        .find((s) => {
          if (scope === "COMPANY") return !s.branchId && s.isDefault;
          return (!s.branchId || s.branchId === branchId) && s.isDefault;
        });
      if (preferred) return preferred.id;
      const first = storages.find(
        (s) =>
          s.isActive &&
          s.category !== "PRODUCTION_INPUT" &&
          (scope === "COMPANY"
            ? !s.branchId
            : !s.branchId || s.branchId === branchId),
      );
      return first?.id ?? "";
    })();
    setInputStorageId(mode === "DEPENDENT" ? shared : "");
    setOutputStorageId(shared);
    setError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setScope("BRANCH");
    setBranchId(branches[0]?.id ?? "");
    setInventoryMode("DEPENDENT");
    setName("");
    setIsActive(true);
    setCreateStorageOpen(false);
    resetDialogFields("DEPENDENT");
    setOpen(true);
  };

  const openEdit = (unit: ProductionUnitListItem) => {
    setEditing(unit);
    setScope(unit.scope);
    setBranchId(unit.branchId ?? branches[0]?.id ?? "");
    setInventoryMode(unit.inventoryMode);
    setInputStorageId(unit.defaultInputStorageId ?? "");
    setOutputStorageId(unit.defaultOutputStorageId ?? "");
    setName(unit.name);
    setIsActive(unit.isActive);
    setError(null);
    setCreateStorageOpen(false);
    setOpen(true);
  };

  const handleInventoryModeChange = (next: ProductionUnitInventoryMode) => {
    setInventoryMode(next);
    if (next === "AUTONOMOUS") {
      const current = storages.find((s) => s.id === inputStorageId);
      if (!current || current.category !== "PRODUCTION_INPUT") {
        setInputStorageId(
          editing?.defaultInputStorageId &&
            storages.some(
              (s) =>
                s.id === editing.defaultInputStorageId &&
                s.category === "PRODUCTION_INPUT",
            )
            ? editing.defaultInputStorageId
            : "",
        );
      }
      if (!outputStorageId) {
        setOutputStorageId(defaultSharedStorageId());
      }
    } else {
      const shared = defaultSharedStorageId();
      const current = storages.find((s) => s.id === inputStorageId);
      if (!current || current.category === "PRODUCTION_INPUT") {
        setInputStorageId(shared);
      }
      if (!outputStorageId) {
        setOutputStorageId(shared);
      }
    }
  };

  const openCreateStorage = (target: CreateStorageTarget) => {
    setCreateStorageTarget(target);
    setCreateStorageOpen(true);
  };

  const handleStorageSelect = (
    target: CreateStorageTarget,
    value: string | number | null,
  ) => {
    const id = value != null ? String(value) : "";
    if (id === CREATE_STORAGE_OPTION_ID) {
      openCreateStorage(target);
      return;
    }
    if (target === "input") {
      setInputStorageId(id);
    } else {
      setOutputStorageId(id);
    }
  };

  const storageCreatePresets = useMemo((): CreateStorageDialogPresets => {
    const lockedBranchId = scope === "BRANCH" ? branchId : null;
    if (createStorageTarget === "input" && inventoryMode === "AUTONOMOUS") {
      return {
        name: suggestedInputStorageName(name),
        branchId: lockedBranchId,
        category: "PRODUCTION_INPUT",
        type: "PRODUCTION_INPUTS",
        lockCategory: true,
        lockBranch: true,
        allowProductionInputCategory: true,
      };
    }
    return {
      branchId: lockedBranchId,
      category: scope === "COMPANY" ? "CENTRAL" : "IN_BRANCH",
      type: "WAREHOUSE",
      lockBranch: true,
      allowProductionInputCategory: false,
    };
  }, [createStorageTarget, inventoryMode, scope, branchId, name]);

  const handleStorageCreated = async (storage: StorageListItem) => {
    setStorages((prev) => {
      if (prev.some((s) => s.id === storage.id)) return prev;
      return [...prev, storage];
    });
    if (createStorageTarget === "input") {
      setInputStorageId(storage.id);
    } else {
      setOutputStorageId(storage.id);
    }
    setCreateStorageOpen(false);
  };

  const inputStorageOk = Boolean(
    inputStorageId &&
      inputCandidates.some((s) => s.id === inputStorageId),
  );
  const outputStorageOk = Boolean(
    outputStorageId &&
      outputCandidates.some((s) => s.id === outputStorageId),
  );
  const autonomousDistinctOk =
    inventoryMode !== "AUTONOMOUS" ||
    (inputStorageId && outputStorageId && inputStorageId !== outputStorageId);

  const saveDisabled =
    saving ||
    !name.trim() ||
    (scope === "BRANCH" && !branchId) ||
    !inputStorageOk ||
    !outputStorageOk ||
    !autonomousDistinctOk;

  const handleSave = async () => {
    if (saveDisabled) return;
    setSaving(true);
    setError(null);

    const payload = {
      scope,
      branchId: scope === "COMPANY" ? null : branchId,
      name: name.trim(),
      inventoryMode,
      defaultInputStorageId: inputStorageId,
      defaultOutputStorageId: outputStorageId,
      isActive,
    };
    const result = editing
      ? await updateProductionUnitAction({ id: editing.id, ...payload })
      : await createProductionUnitAction({ ...payload, isActive: true });
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
          <Button
            variant="primary"
            onClick={openCreate}
            data-test-id="production-units-new"
          >
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
            ? filtered.map((u) => {
                const inName = storageName(u.defaultInputStorageId);
                const outName = storageName(u.defaultOutputStorageId);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => openEdit(u)}
                    data-test-id={`production-unit-card-${u.code}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{u.name}</span>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant="secondary-outlined"
                          className="text-[10px]"
                        >
                          {u.scope === "COMPANY" ? "Empresa" : "Sucursal"}
                        </Badge>
                        <Badge
                          variant="secondary-outlined"
                          className="text-[10px]"
                        >
                          {u.inventoryMode === "AUTONOMOUS"
                            ? "Autónoma"
                            : "Dependiente"}
                        </Badge>
                        <Badge variant={u.isActive ? "success" : "secondary"}>
                          {u.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {u.code} · {branchName(u.branchId)}
                    </p>
                    {inName || outName ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Insumos: {inName ?? "—"} · Salida: {outName ?? "—"}
                      </p>
                    ) : null}
                  </button>
                );
              })
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
            label="Alcance"
            value={scope}
            onChange={(v) =>
              setScope(String(v) === "COMPANY" ? "COMPANY" : "BRANCH")
            }
            options={[
              { id: "BRANCH", label: "Sucursal" },
              { id: "COMPANY", label: "Empresa (sin sucursal)" },
            ]}
            data-test-id="production-unit-scope"
          />
          {scope === "BRANCH" ? (
            <Select
              label="Sucursal"
              value={branchId}
              onChange={(v) => setBranchId(String(v))}
              options={branches.map((b) => ({ id: b.id, label: b.name }))}
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <Select
              label="Modo de inventario"
              value={inventoryMode}
              onChange={(v) =>
                handleInventoryModeChange(
                  String(v) === "AUTONOMOUS" ? "AUTONOMOUS" : "DEPENDENT",
                )
              }
              options={[
                {
                  id: "DEPENDENT",
                  label: "Dependiente (almacenes compartidos)",
                },
                {
                  id: "AUTONOMOUS",
                  label: "Autónoma (insumos exclusivos)",
                },
              ]}
              data-test-id="production-unit-inventory-mode"
            />
            <p className="text-xs text-muted-foreground">
              {inventoryMode === "AUTONOMOUS"
                ? "Insumos: solo almacenes «Insumos de producción» libres. Salida puede ser compartida."
                : "Insumos y salida obligatorios; pueden ser el mismo almacén compartido del local."}
            </p>
          </div>

          <Select
            label={
              inventoryMode === "AUTONOMOUS"
                ? "Almacén de insumos (exclusivo)"
                : "Almacén de insumos"
            }
            value={inputStorageId || null}
            onChange={(v) => handleStorageSelect("input", v)}
            options={inputOptions}
            data-test-id="production-unit-input-storage"
          />

          <Select
            label="Almacén de salida"
            value={outputStorageId || null}
            onChange={(v) => handleStorageSelect("output", v)}
            options={outputOptions}
            data-test-id="production-unit-output-storage"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Obligatorio. Puede ser sala de venta u otro almacén compartido.
            {inventoryMode === "AUTONOMOUS" &&
            inputStorageId &&
            outputStorageId &&
            inputStorageId === outputStorageId
              ? " En modo autónomo insumos y salida deben ser distintos."
              : ""}
          </p>

          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Cocina, Barra, Fábrica pastelería"
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
              disabled={saveDisabled}
              onClick={() => void handleSave()}
              data-test-id="production-unit-save"
            >
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>

      <CreateStorageDialog
        open={createStorageOpen}
        onClose={() => setCreateStorageOpen(false)}
        branches={branches}
        presets={storageCreatePresets}
        onSuccess={handleStorageCreated}
      />
    </>
  );
}
