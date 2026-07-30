import { UpdateAccountingRuleFormSchema } from "../domain/accounting-rule.entity";
import { AccountingRuleRequest } from "../infrastructure/accounting-rule.request";
import type { UpdateAccountingRuleResult } from "../types/accounting-rule.types";

export class UpdateAccountingRuleUseCase {
  static async execute(input: unknown): Promise<UpdateAccountingRuleResult> {
    const parsed = UpdateAccountingRuleFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    const payload: Record<string, unknown> = {};
    if (d.expenseCategoryId !== undefined) payload.expenseCategoryId = d.expenseCategoryId;
    if (d.taxId !== undefined) payload.taxId = d.taxId;
    if (d.paymentMethod !== undefined) payload.paymentMethod = d.paymentMethod;
    if (d.debitAccountId !== undefined && d.debitAccountId !== null) payload.debitAccountId = d.debitAccountId;
    if (d.creditAccountId !== undefined && d.creditAccountId !== null) payload.creditAccountId = d.creditAccountId;
    if (d.priority !== undefined) payload.priority = d.priority;
    if (d.isActive !== undefined) payload.isActive = d.isActive;
    return AccountingRuleRequest.update(d.id, payload);
  }
}

