/** Tipo de documento tributario al confirmar una venta en POS. */
export type SaleDteKind = "TICKET" | "BOLETA" | "FACTURA";

export const SALE_DTE_KIND_LABEL: Record<SaleDteKind, string> = {
  TICKET: "Ticket",
  BOLETA: "Boleta",
  FACTURA: "Factura",
};

export const DEFAULT_SALE_DTE_KIND: SaleDteKind = "TICKET";

export type EffectiveDocumentOption = {
  kind: SaleDteKind;
  enabled: boolean;
  reason?: string;
  availableFolios?: number;
};

export type EffectiveDocumentOptionsResponse =
  | {
      success: true;
      options: EffectiveDocumentOption[];
      defaultKind: SaleDteKind;
    }
  | { success: false; message: string };

export function buildSaleDteSelectOptions(
  options: EffectiveDocumentOption[],
): Array<{ id: SaleDteKind; label: string; disabled?: boolean }> {
  return options.map((o) => ({
    id: o.kind,
    label:
      o.kind === "BOLETA" && o.availableFolios != null
        ? `${SALE_DTE_KIND_LABEL[o.kind]} (${o.availableFolios})`
        : SALE_DTE_KIND_LABEL[o.kind],
    disabled: !o.enabled,
  }));
}

export function effectiveDocumentOptionTitle(option: EffectiveDocumentOption): string | undefined {
  if (option.enabled) return undefined;
  switch (option.reason) {
    case "NO_IMPLEMENTADO":
      return "Próximamente";
    case "NO_PRODUCTION":
      return "Emisión en producción no habilitada";
    case "NO_CAF":
      return "Sin CAF de empresa";
    case "NO_ALLOCATION":
      return "Sin rango de folios asignado a este POS";
    case "NO_FOLIOS":
      return "Sin folios disponibles en este POS";
    default:
      return option.reason;
  }
}
