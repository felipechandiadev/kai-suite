"use client";

import Switch from "@/shared/components/Switch/Switch";

export type DocumentPrintMode = "ticket" | "document";

type Props = {
  value: DocumentPrintMode;
  onChange: (mode: DocumentPrintMode) => void;
  disabled?: boolean;
  className?: string;
  "data-test-id"?: string;
};

/**
 * Ticket ↔ Documento (misma UX que el diálogo de cotización).
 */
export function DocumentPrintModeToggle({
  value,
  onChange,
  disabled = false,
  className = "",
  "data-test-id": dataTestId = "pos-document-print-mode-toggle",
}: Props) {
  const isDocument = value === "document";

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-border px-3 py-2.5 ${className}`}
      data-test-id={dataTestId}
    >
      <span
        className={`text-sm ${!isDocument ? "font-semibold text-foreground" : "text-muted-foreground"}`}
      >
        Ticket (80&nbsp;mm)
      </span>
      <Switch
        checked={isDocument}
        disabled={disabled}
        onChange={(checked) => onChange(checked ? "document" : "ticket")}
        data-test-id={`${dataTestId}-switch`}
      />
      <span
        className={`text-sm ${isDocument ? "font-semibold text-foreground" : "text-muted-foreground"}`}
      >
        Documento (hoja)
      </span>
    </div>
  );
}
