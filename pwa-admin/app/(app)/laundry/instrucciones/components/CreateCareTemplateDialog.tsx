"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, Switch, TextField } from "@kai/ui";
import { createCareTemplateAction } from "@/features/laundry-catalog/actions/laundry-catalog.action";

export type CreateCareTemplateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateCareTemplateDialog({ open, onClose, onSuccess }: CreateCareTemplateDialogProps) {
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setText("");
    setActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createCareTemplateAction({
          label: label.trim(),
          text: text.trim(),
          active,
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
      title="Crear instrucción de cuidado"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 560px)"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="care-template-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isPending || !label.trim() || !text.trim()}
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Etiqueta"
          name="care-template-create-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta"
          required
        />
        <TextField
          label="Texto"
          name="care-template-create-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Texto"
          rows={4}
          required
        />
        <Switch checked={active} onChange={setActive} label="Activo" labelPosition="right" />
      </div>
    </Dialog>
  );
}
