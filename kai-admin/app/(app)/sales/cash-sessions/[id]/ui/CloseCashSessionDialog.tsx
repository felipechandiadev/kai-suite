"use client";

import { useState, useTransition } from "react";
import { DeleteDialog } from "@kai/ui";
import { closeCashSessionFromAdminAction } from "@/features/sales-cash-sessions/actions/close-cash-session.action";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  pointOfSaleName: string | null;
  openedByLabel: string | null;
  onSuccess?: () => void | Promise<void>;
};

export function CloseCashSessionDialog({
  open,
  onClose,
  sessionId,
  pointOfSaleName,
  openedByLabel,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await closeCashSessionFromAdminAction({
          sessionId,
          notes: "Cierre administrativo (sin arqueo)",
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

  const posLabel = pointOfSaleName?.trim() || "esta caja";
  const opener = openedByLabel?.trim();

  return (
    <DeleteDialog
      open={open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      isSubmitting={isPending}
      title="Cerrar sesión de caja"
      confirmLabel="Cerrar caja"
      message={
        <>
          ¿Cerrar la sesión abierta de <strong>{posLabel}</strong>
          {opener ? (
            <>
              {" "}
              (abierta por <strong>{opener}</strong>)
            </>
          ) : null}
          ? Se registrará un cierre administrativo sin arqueo ciego. Esta acción
          no se puede deshacer.
        </>
      }
      errors={error ? [error] : []}
      data-test-id="close-cash-session-dialog"
    />
  );
}
