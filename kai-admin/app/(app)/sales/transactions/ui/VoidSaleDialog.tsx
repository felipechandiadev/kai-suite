"use client";

import { useEffect, useId, useState } from "react";
import {
  Alert,
  Button,
  ButtonPill,
  Dialog,
  DotProgress,
  TextField,
} from "@kai/ui";
import { Ban } from "lucide-react";

export type VoidSaleDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  documentLabel: string;
  customerLabel?: string | null;
  isSubmitting?: boolean;
  errors?: string[];
  "data-test-id"?: string;
};

export default function VoidSaleDialog({
  open,
  onClose,
  onConfirm,
  documentLabel,
  customerLabel,
  isSubmitting = false,
  errors = [],
  "data-test-id": dataTestId = "void-sale-dialog",
}: VoidSaleDialogProps) {
  const formId = useId();
  const formElementId = `void-sale-dialog-form-${formId}`;
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setLocalError(null);
    }
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= 3 && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setLocalError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length < 3) {
      setLocalError("Indique un motivo de anulación (mín. 3 caracteres).");
      return;
    }
    setLocalError(null);
    void onConfirm(trimmed);
  };

  const alertErrors = [
    ...(localError ? [localError] : []),
    ...errors,
  ];

  const alertArea =
    alertErrors.length > 0 ? (
      <div className="flex flex-col gap-2">
        {alertErrors.map((err, i) => (
          <Alert
            key={`${err}-${i}`}
            variant="error"
            data-test-id={`${dataTestId}-error-${i}`}
          >
            {err}
          </Alert>
        ))}
      </div>
    ) : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Anular venta"
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
              "Anular venta"
            )}
          </ButtonPill>
        </>
      }
    >
      <form
        id={formElementId}
        onSubmit={handleSubmit}
        className="flex flex-col"
      >
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
              ¿Anular la venta{" "}
              <strong className="font-semibold">«{documentLabel}»</strong>
              {customerLabel?.trim() ? (
                <>
                  {" "}
                  del cliente{" "}
                  <strong className="font-semibold">
                    «{customerLabel.trim()}»
                  </strong>
                </>
              ) : null}
              ? Esta acción no se puede deshacer.
            </p>
            <p className="m-0 text-sm text-muted-foreground">Al confirmar:</p>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>La venta y sus cobros asociados quedarán anulados.</li>
              <li>Se reinstalará el stock de los productos vendidos.</li>
              <li>
                No aplica a boletas/facturas electrónicas: use devolución / nota
                de crédito fiscal.
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
              placeholder="Ej. Error de cobro, venta duplicada…"
              data-test-id={`${dataTestId}-reason`}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
