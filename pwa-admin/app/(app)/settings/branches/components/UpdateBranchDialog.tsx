"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import LocationPickerWrapper from "@/shared/components/LocationPicker/LocationPickerWrapper";
import { updateBranchAction } from "@/features/settings-branches/actions/branch.action";
import { parseBranchLocation } from "@/features/settings-branches/utils/parse-branch-location";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

export type UpdateBranchDialogProps = {
  open: boolean;
  onClose: () => void;
  branch: BranchListItem;
  /** Llamar tras guardar correctamente (p. ej. `await router.refresh()`). Puede ser async. */
  onSuccess?: () => void | Promise<void>;
};

/**
 * Actualización alineada con el API PUT /branches/:id. Ubicación: modo `update` si ya hay coords, sino `edit`.
 */
export function UpdateBranchDialog({ open, onClose, branch, onSuccess }: UpdateBranchDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const coords = useMemo(
    () => parseBranchLocation(branch.location),
    [branch.id, branch.location],
  );
  const hasCoords = coords != null;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(branch.name);
    setAddress(branch.address ?? "");
    setPhone(branch.phone ?? "");
    setIsActive(branch.isActive);
    setLocation(parseBranchLocation(branch.location));
    setError(null);
  }, [open, branch]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateBranchAction({
          id: branch.id,
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          location:
            location && typeof location.lat === "number" && typeof location.lng === "number"
              ? location
              : null,
          isActive,
          isHeadquarters: branch.isHeadquarters,
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar sucursal"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="branch-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="branch-update-error">
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
            data-test-id="branch-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            data-test-id="branch-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="branch-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="branch-update-name"
        />
        <TextField
          label="Dirección (opcional)"
          name="branch-update-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección (opcional)"
          data-test-id="branch-update-address"
        />
        <TextField
          label="Teléfono (opcional)"
          name="branch-update-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (opcional)"
          data-test-id="branch-update-phone"
        />
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground">Ubicación (opcional)</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Indicá en el mapa o arrastrá el marcador. Se guardan latitud y longitud.
          </p>
          <div className="relative z-10" data-test-id="branch-update-location">
            {open ? (
              hasCoords ? (
                <LocationPickerWrapper
                  key={`update-upd-${branch.id}`}
                  mode="update"
                  externalPosition={coords!}
                  onChange={setLocation}
                  height={22}
                  variant="default"
                  rounded="md"
                />
              ) : (
                <LocationPickerWrapper
                  key={`update-new-${branch.id}`}
                  mode="edit"
                  initialLat={-33.4489}
                  initialLng={-70.6693}
                  onChange={setLocation}
                  height={22}
                  variant="default"
                  rounded="md"
                />
              )
            ) : null}
          </div>
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Sucursal activa"
            labelPosition="right"
            data-test-id="branch-update-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
