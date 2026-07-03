"use client";

import type { PrintFormat } from "./print-format";
import {
  describePrintFormat,
  isDocumentPrintFormat,
} from "./print-format";

type Props = {
  value: PrintFormat;
  onChange: (format: PrintFormat) => void;
  allowedFormats: PrintFormat[];
  disabled?: boolean;
  className?: string;
  "data-test-id"?: string;
};

function defaultDocumentFormat(allowedFormats: PrintFormat[]): PrintFormat {
  return allowedFormats.includes("document_a4")
    ? "document_a4"
    : allowedFormats.find((f) => isDocumentPrintFormat(f)) ?? "document_a4";
}

/**
 * Selector POS: 58 mm, 80 mm y Documento (agrupa carta + A4).
 * Usado en Ajustes → Impresión local; los diálogos de emisión usan `PrintFormatSelector` completo.
 */
export function PosDocumentPrintFormatSelector({
  value,
  onChange,
  allowedFormats,
  disabled = false,
  className = "",
  "data-test-id": dataTestId = "pos-document-print-format-selector",
}: Props) {
  const show58 = allowedFormats.includes("ticket_58mm");
  const show80 = allowedFormats.includes("ticket_80mm");
  const showDocument = allowedFormats.some((f) => isDocumentPrintFormat(f));
  const documentActive = isDocumentPrintFormat(value);

  const buttonClass = (active: boolean) =>
    `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`;

  return (
    <div
      className={`flex flex-wrap gap-1 rounded-lg border border-border p-1 ${className}`}
      role="group"
      aria-label="Formato de impresión"
      data-test-id={dataTestId}
    >
      {show58 ? (
        <button
          type="button"
          disabled={disabled}
          title={describePrintFormat("ticket_58mm")}
          aria-pressed={value === "ticket_58mm"}
          data-test-id={`${dataTestId}-ticket_58mm`}
          onClick={() => onChange("ticket_58mm")}
          className={buttonClass(value === "ticket_58mm")}
        >
          58 mm
        </button>
      ) : null}
      {show80 ? (
        <button
          type="button"
          disabled={disabled}
          title={describePrintFormat("ticket_80mm")}
          aria-pressed={value === "ticket_80mm"}
          data-test-id={`${dataTestId}-ticket_80mm`}
          onClick={() => onChange("ticket_80mm")}
          className={buttonClass(value === "ticket_80mm")}
        >
          80 mm
        </button>
      ) : null}
      {showDocument ? (
        <button
          type="button"
          disabled={disabled}
          title={documentActive ? describePrintFormat(value) : describePrintFormat("document_a4")}
          aria-pressed={documentActive}
          data-test-id={`${dataTestId}-document`}
          onClick={() => {
            if (documentActive && allowedFormats.includes(value)) {
              onChange(value);
              return;
            }
            onChange(defaultDocumentFormat(allowedFormats));
          }}
          className={buttonClass(documentActive)}
        >
          Documento
        </button>
      ) : null}
    </div>
  );
}
