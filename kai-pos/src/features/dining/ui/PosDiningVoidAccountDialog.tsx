"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { voidPosDiningOrderAction } from "@/features/dining/actions/dining-pos.action";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess: () => void;
};

export function PosDiningVoidAccountDialog({
  open,
  onClose,
  orderId,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      return;
    }
    setReason("");
    setError(null);
  }, [open]);

  const handleConfirm = () => {
    setBusy(true);
    setError(null);
    void voidPosDiningOrderAction(orderId, reason.trim() || undefined).then(
      (res) => {
        setBusy(false);
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setError(res.message);
          return;
        }
        onSuccess();
        onClose();
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Anular cuenta"
      size="sm"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={busy}
            data-test-id="pos-dining-void-account-confirm"
          >
            {busy ? "Anulando…" : "Anular cuenta"}
          </Button>
        </>
      }
      actionsJustify="between"
      data-test-id="pos-dining-void-account-dialog"
    >
      <p className="text-sm text-muted-foreground">
        La cuenta saldrá de las listas activas y no se registrará como venta. Esta
        acción no se puede deshacer.
      </p>
      <div className="mt-3">
        <TextField
          label="Motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          data-test-id="pos-dining-void-account-reason"
        />
      </div>
    </Dialog>
  );
}
