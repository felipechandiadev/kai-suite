"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  CollectionPageLayout,
  Dialog,
  IconButton,
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
  KitchenFulfillmentMode,
  ProductionUnitInventoryMode,
  ProductionUnitListItem,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from "@/features/inventory-production-units/types/production-unit.types";
import { LaborUnitAssociationsField } from "@/features/hr-labor-units/ui/LaborUnitAssociationsField";
import { EmployeeAssociationsField } from "@/features/hr-employees/ui/EmployeeAssociationsField";
import { ProductionUnitCard } from "./ProductionUnitCard";

type Props = {
  initialUnits: ProductionUnitListItem[];
  branches: BranchListItem[];
  storages: StorageListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
  employees?: Array<{ id: string; label: string }>;
};

const CREATE_STORAGE_OPTION_ID = "__create_storage__";

type CreateStorageTarget = "input";

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
  laborUnits = [],
  employees = [],
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
  const [purpose, setPurpose] = useState<ProductionUnitPurpose>("KITCHEN");
  const [kitchenFulfillmentMode, setKitchenFulfillmentMode] =
    useState<KitchenFulfillmentMode>("KDS");
  const [inputStorageId, setInputStorageId] = useState<string>("");
  const [laborUnitIds, setLaborUnitIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
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

  const defaultSharedStorageId = () => {
    const preferred = storagesForScope
      .filter((s) => s.category !== "PRODUCTION_INPUT")
      .find((s) => s.isDefault);
    return (
      preferred?.id ??
      storagesForScope.find((s) => s.category !== "PRODUCTION_INPUT")?.id ??
      ""
    );
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
  }, [open, inputCandidates, inputStorageId]);

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
    setError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setScope("BRANCH");
    setBranchId(branches[0]?.id ?? "");
    setInventoryMode("DEPENDENT");
    setPurpose("KITCHEN");
    setKitchenFulfillmentMode("KDS");
    setName("");
    setIsActive(true);
    setLaborUnitIds([]);
    setEmployeeIds([]);
    setCreateStorageOpen(false);
    resetDialogFields("DEPENDENT");
    setOpen(true);
  };

  const openEdit = (unit: ProductionUnitListItem) => {
    setEditing(unit);
    setScope(unit.scope);
    setBranchId(unit.branchId ?? branches[0]?.id ?? "");
    setInventoryMode(unit.inventoryMode);
    setPurpose(unit.purpose === "BATCH" ? "BATCH" : "KITCHEN");
    setKitchenFulfillmentMode(
      unit.kitchenFulfillmentMode === "PRINTED"
        ? "PRINTED"
        : unit.kitchenFulfillmentMode === "BOTH"
          ? "BOTH"
          : "KDS",
    );
    setInputStorageId(unit.defaultInputStorageId ?? "");
    setLaborUnitIds(unit.laborUnitIds ?? []);
    setEmployeeIds(unit.employeeIds ?? []);
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
    } else {
      const shared = defaultSharedStorageId();
      const current = storages.find((s) => s.id === inputStorageId);
      if (!current || current.category === "PRODUCTION_INPUT") {
        setInputStorageId(shared);
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
    setInputStorageId(id);
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
    setInputStorageId(storage.id);
    setCreateStorageOpen(false);
  };

  const inputStorageOk = Boolean(
    inputStorageId &&
      inputCandidates.some((s) => s.id === inputStorageId),
  );

  const saveDisabled =
    saving ||
    !name.trim() ||
    (scope === "BRANCH" && !branchId) ||
    !inputStorageOk;

  const handleSave = async () => {
    if (saveDisabled) return;
    setSaving(true);
    setError(null);

    const payload = {
      scope,
      branchId: scope === "COMPANY" ? null : branchId,
      name: name.trim(),
      inventoryMode,
      purpose,
      defaultInputStorageId: inputStorageId,
      defaultOutputStorageId: null,
      laborUnitIds,
      employeeIds,
      isActive,
      kitchenFulfillmentMode:
        purpose === "KITCHEN" ? kitchenFulfillmentMode : "KDS",
      kitchenPrintSettings: null,
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
          <IconButton
            icon="Plus"
            variant="action"
            size="md"
            ariaLabel="Crear unidad de producción"
            onClick={openCreate}
            data-test-id="production-units-new"
          />
        }
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Código o nombre"
        contentEmptyMessage="No hay unidades de producción"
        contentItems={
          filtered.length > 0
            ? filtered.map((u) => (
                <ProductionUnitCard
                  key={u.id}
                  unit={u}
                  branchLabel={branchName(u.branchId)}
                  inputStorageLabel={storageName(u.defaultInputStorageId)}
                  onEdit={openEdit}
                  data-test-id={`production-unit-card-${u.code}`}
                />
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="production-units-collection"
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
          <LaborUnitAssociationsField
            options={laborUnits}
            value={laborUnitIds}
            onChange={setLaborUnitIds}
            helperText="Opcional. Asociá unidades laborales a esta UP (una UL solo puede estar en una UP)."
          />
          <EmployeeAssociationsField
            options={employees}
            value={employeeIds}
            onChange={setEmployeeIds}
            helperText="Opcional. Empleados individuales además (o en lugar) de una UL."
          />
          <Select
            label="Propósito"
            value={purpose}
            onChange={(v) =>
              setPurpose(String(v) === "BATCH" ? "BATCH" : "KITCHEN")
            }
            options={[
              { id: "KITCHEN", label: "Cocina (comanda / KDS)" },
              { id: "BATCH", label: "Producción por lotes" },
            ]}
            data-test-id="production-unit-purpose"
          />
          {purpose === "KITCHEN" ? (
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <Select
                label="Modo de comanda"
                value={kitchenFulfillmentMode}
                onChange={(v) => {
                  const s = String(v);
                  setKitchenFulfillmentMode(
                    s === "PRINTED" ? "PRINTED" : s === "BOTH" ? "BOTH" : "KDS",
                  );
                }}
                options={[
                  { id: "KDS", label: "Pantalla KDS" },
                  { id: "PRINTED", label: "Comanda impresa" },
                  { id: "BOTH", label: "KDS + comanda impresa" },
                ]}
                data-test-id="production-unit-kitchen-fulfillment"
              />
              {kitchenFulfillmentMode === "PRINTED" ||
              kitchenFulfillmentMode === "BOTH" ? (
                <p className="text-xs text-muted-foreground">
                  La impresora de comandas se configura en cada POS o mesero
                  (Impresión local → Comandas por unidad de producción).
                </p>
              ) : null}
            </div>
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
                ? "Insumos: solo almacenes «Insumos de producción» libres. El almacén de salida se elige en cada orden."
                : "Almacén de insumos obligatorio. La salida del terminado se elige en la orden de producción."}
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

          {editing ? (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/20 p-2">
              Equipo: {editing.employeeCount ?? 0} empleado(s)
              {editing.monthlyPayrollTotal != null
                ? ` · nómina ${editing.monthlyPayrollTotal}`
                : ""}
              {editing.computedCapacity != null ||
              editing.monthlyCapacity != null
                ? ` · ${editing.computedCapacity ?? editing.monthlyCapacity} pzas/30d`
                : ""}
              {editing.laborCostPerUnit != null
                ? ` · MO/pieza ${editing.laborCostPerUnit}`
                : " · MO/pieza — (pendiente de historial o override en variante)"}
            </p>
          ) : null}

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
        laborUnits={laborUnits}
        presets={storageCreatePresets}
        onSuccess={handleStorageCreated}
      />
    </>
  );
}
