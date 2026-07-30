"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { updatePosDiningOrderProfileAction } from "@/features/dining/actions/dining-pos.action";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  /** Título actual (customerName o displayLabel). */
  initialName: string;
  onSaved: () => void;
};

export function PosDiningRenameAccountDialog({
  open,
  onClose,
  orderId,
  initialName,
  onSaved,
}: Props) {
  const fieldWrapRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      return;
    }
    setName(initialName);
    setError(null);
    const t = window.setTimeout(() => {
      fieldWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus({
        preventScroll: true,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [open, initialName]);

  const handleSave = () => {
    setBusy(true);
    setError(null);
    void updatePosDiningOrderProfileAction(orderId, {
      customerName: name.trim(),
    }).then((res) => {
      setBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        return;
      }
      onSaved();
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nombre de la cuenta"
      size="sm"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={busy}
            data-test-id="pos-dining-rename-account-confirm"
          >
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
      actionsJustify="between"
    >
      <div ref={fieldWrapRef}>
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          disabled={busy}
          selectOnFocus
          data-test-id="pos-dining-rename-account-input"
        />
      </div>
    </Dialog>
  );
}
