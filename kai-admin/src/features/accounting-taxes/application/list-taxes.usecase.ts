import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { TaxRequest } from "../infrastructure/tax.request";
import type { ListTaxesResult } from "../types/tax.types";

export class ListTaxesUseCase {
  static async execute(): Promise<ListTaxesResult> {
    const r = await TaxRequest.findAll(true);
    if (!r.success) {
      return r;
    }
    const company = await CompanyRequest.getCurrent();
    if (!company?.id) {
      return { success: true, taxes: r.taxes };
    }
    return {
      success: true,
      taxes: r.taxes.filter((t) => t.companyId === company.id),
    };
  }
}
