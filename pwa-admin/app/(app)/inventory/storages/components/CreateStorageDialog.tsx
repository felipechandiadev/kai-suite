"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type {
  StorageCategory,
  StorageListItem,
  StorageType,
} from "@/features/inventory-storages/types/storage.types";
import { storageCategoryLabel } from "@/features/inventory-storages/types/storage.types";
import { createStorageAction } from "@/features/inventory-storages/actions/storage.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { parseBranchLocation } from "@/features/settings-branches/utils/parse-branch-location";
import LocationPicker from "@/shared/components/LocationPicker/LocationPickerWrapper";
import {
  STORAGE_CATEGORY_SELECT_OPTIONS,
  STORAGE_TYPE_SELECT_OPTIONS,
} from "./storageFormOptions";
import { LaborUnitAssociationsField } from "@/features/hr-labor-units/ui/LaborUnitAssociationsField";

export type CreateStorageDialogPresets = {
  name?: string;
  branchId?: string | null;
  category?: StorageCategory;
  type?: StorageType;
  /** Si true, no se puede cambiar la categoría. */
  lockCategory?: boolean;
  /** Si true, no se puede cambiar la sucursal. */
  lockBranch?: boolean;
  /** Incluye PRODUCTION_INPUT en el select de categoría (p. ej. insumos autónomos). */
  allowProductionInputCategory?: boolean;
};

export type CreateStorageDialogProps = {
  open: boolean;
  onClose: () => void;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
  presets?: CreateStorageDialogPresets | null;
  onSuccess?: (storage: StorageListItem) => void | Promise<void>;
};

export function CreateStorageDialog({
  open,
  onClose,
  branches,
  laborUnits = [],
  presets,
  onSuccess,
}: CreateStorageDialogProps) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState<StorageType>("WAREHOUSE");
  const [category, setCategory] = useState<StorageCategory>("IN_BRANCH");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [laborUnitIds, setLaborUnitIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions = useMemo(() => {
    const sorted = [...branches].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [{ id: "", label: "Sin sucursal" }, ...sorted.map((b) => ({ id: b.id, label: b.name }))];
  }, [branches]);

  const categoryOptions = useMemo(() => {
    if (!presets?.allowProductionInputCategory) {
      return STORAGE_CATEGORY_SELECT_OPTIONS;
    }
    return [
      ...STORAGE_CATEGORY_SELECT_OPTIONS,
      {
        id: "PRODUCTION_INPUT" as const,
        label: storageCategoryLabel("PRODUCTION_INPUT"),
      },
    ];
  }, [presets?.allowProductionInputCategory]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(presets?.name?.trim() ?? "");
    setBranchId(
      presets?.branchId != null && presets.branchId !== ""
        ? String(presets.branchId)
        : "",
    );
    setType(presets?.type ?? "WAREHOUSE");
    setCategory(presets?.category ?? "IN_BRANCH");
    setAddress("");
    setCoords(null);
    setIsDefault(false);
    setIsActive(true);
    setLaborUnitIds([]);
    setError(null);
  }, [open, presets]);

  const selectedBranchCoords = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    return b ? parseBranchLocation(b.location) : null;
  }, [branches, branchId]);

  const selectedBranchAddress = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    return b?.address ?? null;
  }, [branches, branchId]);

  useEffect(() => {
    if (branchId) {
      setCoords(selectedBranchCoords);
      setAddress((selectedBranchAddress ?? "").trim());
    }
  }, [branchId, selectedBranchAddress, selectedBranchCoords]);

  const handleClose = () => {
    setName("");
    setBranchId("");
    setType("WAREHOUSE");
    setCategory("IN_BRANCH");
    setAddress("");
    setCoords(null);
    setIsDefault(false);
    setIsActive(true);
    setLaborUnitIds([]);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createStorageAction({
          name: name.trim(),
          branchId: branchId === "" ? null : branchId,
          type,
          category,
          capacity: "",
          address: address.trim() || undefined,
          location: coords,
          isDefault,
          isActive,
          laborUnitIds,
        });
        if (r.success) {
          await onSuccess?.(r.storage);
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit = name.trim() && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear almacén"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="storage-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="storage-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="storage-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="storage-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="storage-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="storage-create-name"
        />
        <Select
          label="Sucursal"
          name="storage-create-branch"
          value={branchId || null}
          onChange={(id) => setBranchId(id == null ? "" : String(id))}
          options={branchOptions}
          placeholder="Sin sucursal"
          disabled={Boolean(presets?.lockBranch)}
          data-test-id="storage-create-branch"
        />
        <LaborUnitAssociationsField
          options={laborUnits}
          value={laborUnitIds}
          onChange={setLaborUnitIds}
          helperText="Opcional. Asociá unidades laborales a este almacén."
        />
        <Select
          label="Tipo"
          name="storage-create-type"
          value={type}
          onChange={(id) => setType(String(id) as StorageType)}
          options={STORAGE_TYPE_SELECT_OPTIONS}
          required
          data-test-id="storage-create-type"
        />
        <Select
          label="Categoría"
          name="storage-create-category"
          value={category}
          onChange={(id) => setCategory(String(id) as StorageCategory)}
          options={categoryOptions}
          required
          disabled={Boolean(presets?.lockCategory)}
          data-test-id="storage-create-category"
        />
        <TextField
          label="Dirección (opcional)"
          name="storage-create-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          rows={2}
          disabled={Boolean(branchId)}
          data-test-id="storage-create-address"
        />
        <div className="flex flex-col gap-2" data-test-id="storage-create-location-picker">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ubicación en mapa
          </div>
          <LocationPicker
            key={`storage-create-map-${branchId || "no-branch"}-${selectedBranchCoords?.lat ?? "x"}-${selectedBranchCoords?.lng ?? "y"}`}
            mode={branchId ? "viewer" : "edit"}
            variant="default"
            rounded="md"
            className="w-full"
            zoom={16}
            initialLat={(coords ?? selectedBranchCoords)?.lat}
            initialLng={(coords ?? selectedBranchCoords)?.lng}
            draggable={!branchId}
            onChange={(p) => setCoords(p)}
          />
          {branchId ? (
            <p
              className="text-xs text-muted-foreground"
              data-test-id="storage-create-location-inherited"
            >
              La ubicación se hereda de la sucursal seleccionada.
            </p>
          ) : null}
        </div>
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Almacén predeterminado"
            labelPosition="right"
            data-test-id="storage-create-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="storage-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
