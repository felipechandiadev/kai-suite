import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { AccountingRuleRequest } from "../infrastructure/accounting-rule.request";
import type { ListAccountingRulesResult } from "../types/accounting-rule.types";

export class ListAccountingRulesUseCase {
  static async execute(): Promise<ListAccountingRulesResult> {
    const company = await CompanyRequest.getCurrent();
    if (!company?.id) {
      return { success: false, error: "Configura la empresa en Ajustes para listar reglas contables.", rules: [] };
    }
    return AccountingRuleRequest.list(company.id);
  }
}

