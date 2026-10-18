"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { createLaborUnitAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import type { LaborUnitView } from "@/features/hr-labor-units/types/labor-unit.types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (unit: LaborUnitView) => void;
};

export function CreateLaborUnitDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setError(null);
  }, [open]);

  function save() {
    if (!name.trim()) {
      setError("Nombre requerido");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createLaborUnitAction({
        name: name.trim(),
        description: description.trim() || null,
        isActive: true,
      });
      if (!res.success) {
        setError(res.message);
        return;
      }
      onCreated?.(res.data);
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crear unidad laboral"
      size="md"
      data-test-id="labor-unit-quick-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="labor-unit-quick-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            data-test-id="labor-unit-quick-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="labor-unit-name"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={pending}
          data-test-id="labor-unit-quick-create-name"
        />
        <TextField
          label="Descripción (opcional)"
          name="labor-unit-description"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          data-test-id="labor-unit-quick-create-description"
        />
      </div>
    </Dialog>
  );
}
