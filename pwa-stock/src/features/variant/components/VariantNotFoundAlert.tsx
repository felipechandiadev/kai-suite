"use client";

import { Button, IconButton } from "@kai/ui";

export type VariantNotFoundAlertProps = {
  code: string;
  pending?: boolean;
  onDismiss: () => void;
  onCreate: () => void;
};

export default function VariantNotFoundAlert({
  code,
  pending = false,
  onDismiss,
  onCreate,
}: VariantNotFoundAlertProps) {
  return (
    <div
      className="relative rounded-lg border border-[var(--color-warning)] bg-transparent p-4 pb-12"
      role="alert"
      data-test-id="variant-not-found-alert"
    >
      <p className="pb-10 text-sm text-foreground">
        No existe una variante con el código <strong>{code}</strong>. ¿Deseas registrar un producto
        nuevo?
      </p>
      <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-2">
        <IconButton
          icon="X"
          variant="action"
          size="sm"
          ariaLabel="Cerrar"
          disabled={pending}
          onClick={onDismiss}
          data-test-id="variant-not-found-dismiss"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={onCreate}
          data-test-id="variant-not-found-create"
        >
          Crear producto
        </Button>
      </div>
    </div>
  );
}
