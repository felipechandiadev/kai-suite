import type { TaxListItem } from "../types/tax.types";

export function catalogDefaultIvaTaxIds(taxes: TaxListItem[]): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return iva[0]?.id != null ? [iva[0].id] : [];
}
