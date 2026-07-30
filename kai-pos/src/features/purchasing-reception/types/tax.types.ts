export const TAX_TYPES = ["IVA", "EXEMPT", "RETENTION", "SPECIFIC"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export type TaxListItem = {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  taxType: TaxType;
  rate: number;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  /** API: no se puede eliminar (borrado lógico bloqueado). */
  nonDeletable?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListTaxesResult =
  | { success: true; taxes: TaxListItem[] }
  | { success: false; error: string; taxes: [] };

export type CreateTaxResult =
  | { success: true; tax: TaxListItem }
  | { success: false; error: string };

export type UpdateTaxResult =
  | { success: true; tax: TaxListItem }
  | { success: false; error: string };

export type DeleteTaxResult = { success: true } | { success: false; error: string };

export function taxTypeLabel(t: TaxType): string {
  switch (t) {
    case "IVA":
      return "IVA";
    case "EXEMPT":
      return "Exento";
    case "RETENTION":
      return "Retención";
    case "SPECIFIC":
      return "Específico";
    default:
      return t;
  }
}

export function formatTaxRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    return "—";
  }
  const rounded = Math.round(rate * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded} %`;
  }
  return `${String(rounded).replace(".", ",")} %`;
}
