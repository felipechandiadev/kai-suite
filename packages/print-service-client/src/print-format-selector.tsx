"use client";

import type { PrintFormat } from "./print-format";
import { PRINT_FORMATS, describePrintFormat } from "./print-format";

type Props = {
  value: PrintFormat;
  onChange: (format: PrintFormat) => void;
  disabled?: boolean;
  className?: string;
  "data-test-id"?: string;
};

const SHORT_LABELS: Record<PrintFormat, string> = {
  ticket_58mm: "58 mm",
  ticket_80mm: "80 mm",
  document_letter: "Carta",
  document_a4: "A4",
};

/**
 * Selector de formato de impresión (58 mm, 80 mm, carta, A4).
 */
export function PrintFormatSelector({
  value,
  onChange,
  disabled = false,
  className = "",
  "data-test-id": dataTestId = "print-format-selector",
}: Props) {
  return (
    <div
      className={`flex flex-wrap gap-1 rounded-lg border border-border bg-muted/20 p-1 ${className}`}
      role="group"
      aria-label="Formato de impresión"
      data-test-id={dataTestId}
    >
      {PRINT_FORMATS.map((format) => {
        const active = value === format;
        return (
          <button
            key={format}
            type="button"
            disabled={disabled}
            title={describePrintFormat(format)}
            aria-pressed={active}
            data-test-id={`${dataTestId}-${format}`}
            onClick={() => onChange(format)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {SHORT_LABELS[format]}
          </button>
        );
      })}
    </div>
  );
}
