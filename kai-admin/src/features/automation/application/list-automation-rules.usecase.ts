import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { AutomationRequest } from "../infrastructure/automation.request";
import type { AutomationRuleDto } from "../types/automation.types";

export class ListAutomationRulesUseCase {
  static async execute(): Promise<
    { success: true; rules: AutomationRuleDto[] } | { success: false; error: string; rules: [] }
  > {
    const c = await CompanyRequest.getCurrent();
    if (!c?.id) {
      return { success: false, error: "No se pudo resolver companyId", rules: [] };
    }
    return AutomationRequest.list(c.id);
  }
}

