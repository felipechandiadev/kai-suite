"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import LocationPickerWrapper from "@/shared/components/LocationPicker/LocationPickerWrapper";
import { createBranchAction } from "@/features/settings-branches/actions/branch.action";
import { LaborUnitAssociationsField } from "@/features/hr-labor-units/ui/LaborUnitAssociationsField";

export type CreateBranchDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

/**
 * Diálogo de creación: campos alineados con la entidad. `companyId` lo resuelve el use case (empresa actual / por defecto).
 * Ubicación: LocationPicker. Activa: Switch.
 */
export function CreateBranchDialog({
  open,
  onClose,
  onSuccess,
  laborUnits = [],
}: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [laborUnitIds, setLaborUnitIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setAddress("");
    setPhone("");
    setLocation(null);
    setIsActive(true);
    setLaborUnitIds([]);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setName("");
    setAddress("");
    setPhone("");
    setLocation(null);
    setIsActive(true);
    setLaborUnitIds([]);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createBranchAction({
          name: name.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location && typeof location.lat === "number" ? location : null,
          isActive,
          laborUnitIds,
        });
        if (r.success) {
          onSuccess?.();
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
      title="Crear sucursal"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="branch-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="branch-create-error">
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
            data-test-id="branch-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            data-test-id="branch-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="branch-create-name"
        />
        <TextField
          label="Dirección (opcional)"
          name="branch-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección (opcional)"
          data-test-id="branch-create-address"
        />
        <TextField
          label="Teléfono (opcional)"
          name="branch-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (opcional)"
          data-test-id="branch-create-phone"
        />
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground">Ubicación (opcional)</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Indicá en el mapa o arrastrá el marcador. Se guardan latitud y longitud.
          </p>
          <div className="relative z-10" data-test-id="branch-create-location">
            {open ? (
              <LocationPickerWrapper
                mode="edit"
                initialLat={-33.4489}
                initialLng={-70.6693}
                onChange={setLocation}
                height={22}
                variant="default"
                rounded="md"
              />
            ) : null}
          </div>
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Sucursal activa"
            labelPosition="right"
            data-test-id="branch-create-active"
          />
        </div>
        <LaborUnitAssociationsField
          options={laborUnits}
          value={laborUnitIds}
          onChange={setLaborUnitIds}
          helperText="Opcional. Asociá unidades laborales a esta sucursal."
        />
      </div>
    </Dialog>
  );
}
