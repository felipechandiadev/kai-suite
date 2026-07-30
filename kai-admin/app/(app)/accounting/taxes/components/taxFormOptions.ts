import type { TaxType } from "@/features/accounting-taxes/types/tax.types";
import { TAX_TYPES, taxTypeLabel } from "@/features/accounting-taxes/types/tax.types";

export const TAX_TYPE_SELECT_OPTIONS = TAX_TYPES.map((id) => ({
  id: id as TaxType,
  label: taxTypeLabel(id),
}));
