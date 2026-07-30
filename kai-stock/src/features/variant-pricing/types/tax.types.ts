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
};
