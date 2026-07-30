import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { CreateChartOfAccountFormSchema } from "../domain/chart-of-account.entity";
import { ChartOfAccountsRequest } from "../infrastructure/chart-of-accounts.request";
import type { CreateChartOfAccountResult } from "../types/chart-of-accounts.types";

export class CreateChartOfAccountUseCase {
  static async execute(input: unknown): Promise<CreateChartOfAccountResult> {
    const parsed = CreateChartOfAccountFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }

    const company = await CompanyRequest.getCurrent();
    if (!company?.id) {
      return {
        success: false,
        error: "Configura la empresa (con identificador válido) en Ajustes para crear cuentas contables.",
      };
    }

    const d = parsed.data;
    return ChartOfAccountsRequest.createAccount({
      companyId: company.id,
      code: d.code.trim(),
      name: d.name.trim(),
      type: d.type,
      parentId: d.parentId,
      isActive: d.isActive,
    });
  }
}

