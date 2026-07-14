"use client";

import { Alert, Button, Dialog } from "@kai/ui";

type CancelDeliveryOccurrenceDialogProps = {
  open: boolean;
  occurrenceName: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function CancelDeliveryOccurrenceDialog({
  open,
  occurrenceName,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: CancelDeliveryOccurrenceDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancelar reparto"
      size="sm"
      actionsJustify="end"
      data-test-id="cancel-delivery-occurrence"
      alertArea={
        error ? <Alert variant="error">{error}</Alert> : null
      }
      actions={
        <>
          <Button type="button" variant="outlinedSecondary" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Cancelando…" : "Confirmar cancelación"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-foreground">
        ¿Cancelar el reparto <strong>{occurrenceName}</strong>? Se conservará el historial
        y dejará de estar disponible en el checkout.
      </p>
    </Dialog>
  );
}
