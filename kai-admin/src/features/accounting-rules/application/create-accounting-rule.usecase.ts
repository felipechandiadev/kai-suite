import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { CreateAccountingRuleFormSchema } from "../domain/accounting-rule.entity";
import { AccountingRuleRequest } from "../infrastructure/accounting-rule.request";
import type { CreateAccountingRuleResult } from "../types/accounting-rule.types";

export class CreateAccountingRuleUseCase {
  static async execute(input: unknown): Promise<CreateAccountingRuleResult> {
    const parsed = CreateAccountingRuleFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const company = await CompanyRequest.getCurrent();
    if (!company?.id) {
      return { success: false, error: "Configura la empresa en Ajustes para crear reglas contables." };
    }
    const d = parsed.data;
    return AccountingRuleRequest.create({
      companyId: company.id,
      appliesTo: d.appliesTo,
      transactionType: d.transactionType,
      expenseCategoryId: d.expenseCategoryId ?? undefined,
      taxId: d.taxId ?? undefined,
      paymentMethod: d.paymentMethod ?? undefined,
      debitAccountId: d.debitAccountId,
      creditAccountId: d.creditAccountId,
      priority: d.priority,
      isActive: d.isActive,
    });
  }
}

