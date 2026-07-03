"use client";

import type { PrintFormat } from "./print-format";
import { PRINT_FORMATS, describePrintFormat } from "./print-format";

type Props = {
  value: PrintFormat;
  onChange: (format: PrintFormat) => void;
  /** Si se omite, se muestran los cuatro formatos. */
  allowedFormats?: PrintFormat[];
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
  allowedFormats,
  disabled = false,
  className = "",
  "data-test-id": dataTestId = "print-format-selector",
}: Props) {
  const formats =
    allowedFormats && allowedFormats.length > 0
      ? PRINT_FORMATS.filter((f) => allowedFormats.includes(f))
      : PRINT_FORMATS;

  return (
    <div
      className={`flex flex-wrap gap-1 rounded-lg border border-border p-1 ${className}`}
      role="group"
      aria-label="Formato de impresión"
      data-test-id={dataTestId}
    >
      {formats.map((format) => {
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
                : "text-muted-foreground hover:text-foreground"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {SHORT_LABELS[format]}
          </button>
        );
      })}
    </div>
  );
}
