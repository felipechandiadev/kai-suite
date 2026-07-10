"use client";

import { IconButton } from "@kai/ui";

type Props = {
  busy?: boolean;
  disabled?: boolean;
  onPrint: () => void | Promise<void>;
  "data-test-id"?: string;
};

/** Envía documento de prueba al agente o al diálogo del navegador. */
export function DocumentPrintTestButton({
  busy = false,
  disabled = false,
  onPrint,
  "data-test-id": dataTestId = "pos-document-print-test",
}: Props) {
  return (
    <IconButton
      type="button"
      icon="Printer"
      variant="action"
      size="sm"
      className="mt-0.5 shrink-0"
      ariaLabel="Imprimir documento de prueba"
      disabled={disabled || busy}
      isLoading={busy}
      data-test-id={dataTestId}
      onClick={() => void onPrint()}
    />
  );
}
