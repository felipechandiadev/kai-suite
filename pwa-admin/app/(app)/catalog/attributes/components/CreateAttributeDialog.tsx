"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Badge } from "@kai/ui";
import { createAttributeAction } from "@/features/inventory-attributes/actions/attribute.action";

export type CreateAttributeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateAttributeDialog({ open, onClose, onSuccess }: CreateAttributeDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setDescription("");
    setOptions([]);
    setNewOption("");
    setError(null);
  }, [open]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setOptions([]);
    setNewOption("");
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createAttributeAction({
          name: name.trim(),
          description: description.trim() || undefined,
          options,
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

  const canSubmit = name.trim() && options.length > 0 && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear atributo"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="attribute-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="attribute-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="attribute-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="attribute-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre del atributo"
          name="attr-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del atributo"
          required
          data-test-id="attribute-create-name"
        />
        <TextField
          label="Descripción"
          name="attr-create-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="attribute-create-description"
        />
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Opciones <span className="text-red-600">*</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <TextField
                label="Nueva opción"
                name="attr-create-new-option"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Nueva opción"
                data-test-id="attribute-create-new-option"
              />
            </div>
            <div className="flex shrink-0 justify-end sm:justify-start sm:pb-1">
              <IconButton
                icon="Plus"
                variant="neutral"
                size="md"
                ariaLabel="Agregar opción"
                onClick={handleAddOption}
                data-test-id="attribute-create-add-option"
              />
            </div>
          </div>
          {options.length > 0 ? (
            <div
              className="mt-3 flex min-h-[3.75rem] flex-wrap gap-2 rounded-lg border border-border/60 bg-neutral/30 p-3"
              data-test-id="attribute-create-options-list"
            >
              {options.map((opt, index) => (
                <Badge key={`${opt}-${index}`} variant="secondary" className="flex max-w-full items-center gap-1 pr-0.5">
                  <span className="truncate">{opt}</span>
                  <button
                    type="button"
                    className="rounded px-1 text-base leading-none text-muted-foreground hover:text-red-600"
                    aria-label={`Quitar ${opt}`}
                    onClick={() => handleRemoveOption(index)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-border/80 bg-neutral/20 p-3 text-sm text-muted-foreground">
              No hay opciones. Escribe una y pulsa Agregar o Enter.
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
