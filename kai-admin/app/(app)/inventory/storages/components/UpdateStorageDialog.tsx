"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { StorageCategory, StorageListItem, StorageType } from "@/features/inventory-storages/types/storage.types";
import { updateStorageAction } from "@/features/inventory-storages/actions/storage.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { parseBranchLocation } from "@/features/settings-branches/utils/parse-branch-location";
import LocationPicker from "@/shared/components/LocationPicker/LocationPickerWrapper";
import { parseStorageLocation } from "@/features/inventory-storages/utils/parse-storage-location";
import { STORAGE_CATEGORY_SELECT_OPTIONS, STORAGE_TYPE_SELECT_OPTIONS } from "./storageFormOptions";
import { LaborUnitAssociationsField } from "@/features/hr-labor-units/ui/LaborUnitAssociationsField";

export type UpdateStorageDialogProps = {
  open: boolean;
  onClose: () => void;
  storage: StorageListItem;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateStorageDialog({
  open,
  onClose,
  storage,
  branches,
  laborUnits = [],
  onSuccess,
}: UpdateStorageDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState<StorageType>("WAREHOUSE");
  const [category, setCategory] = useState<StorageCategory>("IN_BRANCH");
  const [capacityStr, setCapacityStr] = useState("");
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

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(storage.name);
    setCode(storage.code ?? "");
    setBranchId(storage.branchId ?? "");
    setType(storage.type);
    setCategory(storage.category);
    setCapacityStr(storage.capacity != null ? String(storage.capacity) : "");
    setAddress(storage.address ?? "");
    setCoords(parseStorageLocation(storage.location));
    setIsDefault(storage.isDefault);
    setIsActive(storage.isActive);
    setLaborUnitIds(storage.laborUnitIds ?? []);
    setError(null);
  }, [open, storage]);

  const selectedBranchCoords = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    return b ? parseBranchLocation(b.location) : null;
  }, [branches, branchId]);

  const selectedBranchAddress = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    return b?.address ?? null;
  }, [branches, branchId]);

  useEffect(() => {
    // Si hay sucursal seleccionada, el almacén hereda SIEMPRE su ubicación (si existe).
    // Si la sucursal no tiene coordenadas, almacenamos null.
    if (branchId) {
      setCoords(selectedBranchCoords);
      setAddress((selectedBranchAddress ?? "").trim());
    }
  }, [branchId, selectedBranchAddress, selectedBranchCoords]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateStorageAction({
          id: storage.id,
          name: name.trim(),
          code: code.trim(),
          branchId: branchId === "" ? null : branchId,
          type,
          category,
          capacity: capacityStr,
          address: address.trim() ? address.trim() : null,
          location: coords,
          isDefault,
          isActive,
          laborUnitIds,
        });
        if (r.success) {
          await onSuccess?.();
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
      title="Actualizar almacén"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="storage-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="storage-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="storage-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="storage-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="storage-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="storage-update-name"
        />
        <TextField
          label="Dirección (opcional)"
          name="storage-update-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          rows={2}
          disabled={Boolean(branchId)}
          data-test-id="storage-update-address"
        />
        <Select
          label="Sucursal"
          name="storage-update-branch"
          value={branchId || null}
          onChange={(id) => setBranchId(id == null ? "" : String(id))}
          options={branchOptions}
          placeholder="Sin sucursal"
          data-test-id="storage-update-branch"
        />
        <LaborUnitAssociationsField
          options={laborUnits}
          value={laborUnitIds}
          onChange={setLaborUnitIds}
          helperText="Opcional. Asociá unidades laborales a este almacén."
        />
        <Select
          label="Tipo"
          name="storage-update-type"
          value={type}
          onChange={(id) => setType(String(id) as StorageType)}
          options={STORAGE_TYPE_SELECT_OPTIONS}
          required
          data-test-id="storage-update-type"
        />
        <Select
          label="Categoría"
          name="storage-update-category"
          value={category}
          onChange={(id) => {
            const next = String(id) as StorageCategory;
            setCategory(next);
          }}
          options={STORAGE_CATEGORY_SELECT_OPTIONS}
          required
          data-test-id="storage-update-category"
        />
        <div className="flex flex-col gap-2" data-test-id="storage-update-location-picker">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubicación en mapa</div>
          <LocationPicker
            key={`storage-update-map-${storage.id}-${branchId || "no-branch"}-${selectedBranchCoords?.lat ?? "x"}-${selectedBranchCoords?.lng ?? "y"}`}
            mode={branchId ? "viewer" : "update"}
            variant="default"
            rounded="md"
            className="w-full"
            zoom={16}
            initialLat={(coords ?? selectedBranchCoords)?.lat}
            initialLng={(coords ?? selectedBranchCoords)?.lng}
            externalPosition={coords ?? undefined}
            draggable={!branchId}
            onChange={(p) => setCoords(p)}
          />
          {branchId ? (
            <p className="text-xs text-muted-foreground" data-test-id="storage-update-location-inherited">
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
            data-test-id="storage-update-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="storage-update-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
