"use client";

import type { PosDocumentPrintMode } from "./print-format";

type Props = {
  value: PosDocumentPrintMode;
  onChange: (mode: PosDocumentPrintMode) => void;
  allowedModes?: PosDocumentPrintMode[];
  disabled?: boolean;
  className?: string;
  "data-test-id"?: string;
};

/**
 * Selector POS: Ticket o Documento (sin elegir 58/80 mm; el ancho lo define la impresora en Kai Printers).
 */
export function PosDocumentPrintModeSelector({
  value,
  onChange,
  allowedModes = ["ticket", "document"],
  disabled = false,
  className = "",
  "data-test-id": dataTestId = "pos-document-print-mode-selector",
}: Props) {
  const showTicket = allowedModes.includes("ticket");
  const showDocument = allowedModes.includes("document");

  const buttonClass = (active: boolean) =>
    `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`;

  return (
    <div
      className={`flex flex-wrap gap-1 rounded-lg border border-border bg-muted/20 p-1 ${className}`}
      role="group"
      aria-label="Modo de impresión"
      data-test-id={dataTestId}
    >
      {showTicket ? (
        <button
          type="button"
          disabled={disabled}
          title="Ticket"
          aria-pressed={value === "ticket"}
          className={buttonClass(value === "ticket")}
          onClick={() => onChange("ticket")}
          data-test-id={`${dataTestId}-ticket`}
        >
          Ticket
        </button>
      ) : null}
      {showDocument ? (
        <button
          type="button"
          disabled={disabled}
          title="Documento"
          aria-pressed={value === "document"}
          className={buttonClass(value === "document")}
          onClick={() => onChange("document")}
          data-test-id={`${dataTestId}-document`}
        >
          Documento
        </button>
      ) : null}
    </div>
  );
}
