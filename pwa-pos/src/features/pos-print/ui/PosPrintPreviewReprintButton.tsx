"use client";

import { IconButton } from "@kai/ui";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
  "data-test-id"?: string;
};

/** Reimpresión desde diálogos de vista previa POS (sustituye botón outlined «Imprimir»). */
export function PosPrintPreviewReprintButton({
  onClick,
  disabled,
  isLoading,
  title = "Imprimir de nuevo",
  "data-test-id": testId,
}: Props) {
  return (
    <IconButton
      icon="Printer"
      variant="secondary"
      size="md"
      ariaLabel={title}
      title={title}
      disabled={disabled}
      isLoading={isLoading}
      onClick={onClick}
      data-test-id={testId}
    />
  );
}
