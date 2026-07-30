import { AccountingRuleRequest } from "../infrastructure/accounting-rule.request";
import type { DeleteAccountingRuleResult } from "../types/accounting-rule.types";

export class DeleteAccountingRuleUseCase {
  static async execute(id: string): Promise<DeleteAccountingRuleResult> {
    if (!id?.trim()) {
      return { success: false, error: "Identificador inválido" };
    }
    return AccountingRuleRequest.remove(id);
  }
}

