"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Badge, Button, Dialog, IconButton, Switch, TextField } from "@kai/ui";
import type { AttributeValue, GarmentAttribute } from "@/features/laundry-catalog/types/laundry-catalog.types";
import {
  createAttributeValueAction,
  deleteAttributeValueAction,
  updateAttributeValueAction,
} from "@/features/laundry-catalog/actions/laundry-catalog.action";

export type ManageAttributeValuesDialogProps = {
  open: boolean;
  onClose: () => void;
  attribute: GarmentAttribute;
  onSuccess?: () => void | Promise<void>;
};

export function ManageAttributeValuesDialog({
  open,
  onClose,
  attribute,
  onSuccess,
}: ManageAttributeValuesDialogProps) {
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setNewLabel("");
    setError(null);
  }, [open, attribute.id]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const refreshAfterMutation = async () => {
    await onSuccess?.();
  };

  const handleAddValue = () => {
    const label = newLabel.trim();
    if (!label) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createAttributeValueAction({
          attributeId: attribute.id,
          label,
          active: true,
        });
        if (r.success) {
          setNewLabel("");
          await refreshAfterMutation();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const handleToggleValue = (value: AttributeValue) => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateAttributeValueAction({
          attributeId: attribute.id,
          valueId: value.id,
          active: !value.active,
        });
        if (r.success) {
          await refreshAfterMutation();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const handleDeleteValue = (value: AttributeValue) => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await deleteAttributeValueAction(attribute.id, value.id);
        if (r.success) {
          await refreshAfterMutation();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const displayValues = attribute.values;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Valores — ${attribute.name}`}
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="attribute-values-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
          Cerrar
        </Button>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex gap-2">
          <TextField
            className="flex-1"
            label="Nuevo valor"
            name="attribute-value-new-label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nuevo valor"
          />
          <Button
            variant="primary"
            size="md"
            className="self-end shrink-0"
            onClick={handleAddValue}
            disabled={isPending || !newLabel.trim()}
          >
            Agregar
          </Button>
        </div>

        {displayValues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin valores definidos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {displayValues.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm">{v.label}</span>
                  {!v.active && (
                    <Badge variant="secondary">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={v.active}
                    onChange={() => handleToggleValue(v)}
                    label="Activo"
                    labelPosition="right"
                    disabled={isPending}
                  />
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    ariaLabel={`Eliminar valor ${v.label}`}
                    disabled={isPending}
                    onClick={() => handleDeleteValue(v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
