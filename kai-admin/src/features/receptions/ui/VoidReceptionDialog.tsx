"use client";

import { useEffect, useId, useState } from "react";
import { Alert, Button, ButtonPill, Dialog, DotProgress, TextField } from "@kai/ui";
import { Ban } from "lucide-react";

export type VoidReceptionDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, acknowledgePmpNotRestored: boolean) => void | Promise<void>;
  documentLabel: string;
  supplierLabel?: string | null;
  isSubmitting?: boolean;
  errors?: string[];
  "data-test-id"?: string;
};

/** El backend pide confirmación explícita cuando el PMP no puede restaurarse de forma exacta. */
function needsPmpAcknowledge(errors: string[]): boolean {
  return errors.some((e) => e.includes("acknowledgePmpNotRestored"));
}

export default function VoidReceptionDialog({
  open,
  onClose,
  onConfirm,
  documentLabel,
  supplierLabel,
  isSubmitting = false,
  errors = [],
  "data-test-id": dataTestId = "void-reception-dialog",
}: VoidReceptionDialogProps) {
  const formId = useId();
  const formElementId = `void-reception-dialog-form-${formId}`;
  const [reason, setReason] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setAcknowledge(false);
      setLocalError(null);
    }
  }, [open]);

  const trimmed = reason.trim();
  const askAcknowledge = needsPmpAcknowledge(errors);
  const canSubmit = trimmed.length >= 3 && !isSubmitting && (!askAcknowledge || acknowledge);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length < 3) {
      setLocalError("Indique un motivo de anulación (mín. 3 caracteres).");
      return;
    }
    setLocalError(null);
    void onConfirm(trimmed, askAcknowledge && acknowledge);
  };

  const alertErrors = [...(localError ? [localError] : []), ...errors];
  const alertArea =
    alertErrors.length > 0 ? (
      <div className="flex flex-col gap-2">
        {alertErrors.map((err, i) => (
          <Alert key={`${err}-${i}`} variant="error" data-test-id={`${dataTestId}-error-${i}`}>
            {err}
          </Alert>
        ))}
      </div>
    ) : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Anular recepción"
      size="custom"
      maxWidth="28rem"
      scroll="body"
      actionsJustify="between"
      data-test-id={dataTestId}
      showCloseButton={false}
      alertArea={alertArea}
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
            data-test-id={`${dataTestId}-cancel`}
          >
            Cancelar
          </Button>
          <ButtonPill
            type="submit"
            form={formElementId}
            variant="primary"
            disabled={!canSubmit}
            className="!bg-red-600 hover:!bg-red-700 !text-white !font-semibold"
            data-test-id={`${dataTestId}-confirm`}
          >
            {isSubmitting ? (
              <span className="inline-flex min-h-[1.25rem] items-center justify-center">
                <DotProgress size={12} />
              </span>
            ) : (
              "Anular recepción"
            )}
          </ButtonPill>
        </>
      }
    >
      <form id={formElementId} onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-2 flex flex-col space-y-4">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50"
              aria-hidden
            >
              <Ban size={24} strokeWidth={1.5} className="text-red-500" />
            </div>
          </div>
          <div
            className="space-y-3 text-left text-base leading-relaxed text-foreground"
            data-test-id={`${dataTestId}-message`}
          >
            <p className="m-0">
              ¿Anular la recepción <strong className="font-semibold">«{documentLabel}»</strong>
              {supplierLabel?.trim() ? (
                <>
                  {" "}
                  del proveedor <strong className="font-semibold">«{supplierLabel.trim()}»</strong>
                </>
              ) : null}
              ? Esta acción no se puede deshacer.
            </p>
            <p className="m-0 text-sm text-muted-foreground">Al confirmar:</p>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Se descontará del inventario la mercadería recibida.</li>
              <li>Se restaurará el PMP cuando no haya movimientos posteriores.</li>
              <li>La factura/boleta del proveedor y sus cuotas pendientes quedarán anuladas.</li>
              <li>
                No se puede anular si hay pagos aplicados, devoluciones o si el stock ya se consumió.
                Para corregir, vuelva a ingresar la recepción.
              </li>
            </ul>
            <TextField
              label="Motivo de anulación"
              name="voidReason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (localError) setLocalError(null);
              }}
              rows={3}
              required
              disabled={isSubmitting}
              placeholder="Motivo de anulación"
              data-test-id={`${dataTestId}-reason`}
            />
            {askAcknowledge ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                  disabled={isSubmitting}
                  data-test-id={`${dataTestId}-ack-pmp`}
                />
                <span>Anular de todos modos dejando el PMP sin cambios.</span>
              </label>
            ) : null}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
