"use client";

import { useState, useTransition } from "react";
import { DeleteDialog } from "@kai/ui";
import { deleteMetalPriceAction } from "@/features/metal-prices/actions/metal-price.action";
import type { MetalPriceRow } from "@/features/metal-prices/types/metal-price.types";

export type DeleteMetalPriceDialogProps = {
  open: boolean;
  onClose: () => void;
  row: MetalPriceRow | null;
  onSuccess?: () => void | Promise<void>;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DeleteMetalPriceDialog({ open, onClose, row, onSuccess }: DeleteMetalPriceDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!row) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await deleteMetalPriceAction(row.id);
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
    <DeleteDialog
      open={open && row != null}
      onClose={handleClose}
      onConfirm={handleConfirm}
      isSubmitting={isPending}
      title="Eliminar precio de metal"
      message={
        row ? (
          <>
            ¿Eliminar el registro de <strong>{row.metal}</strong> por{" "}
            <strong>{fmtClp(row.valueCLP)}</strong>? Esta acción no se puede deshacer.
          </>
        ) : null
      }
      errors={error ? [error] : []}
      data-test-id="delete-metal-price-dialog"
    />
  );
}
