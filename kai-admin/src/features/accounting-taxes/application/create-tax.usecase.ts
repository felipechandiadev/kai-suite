import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { CreateTaxFormSchema } from "../domain/tax.entity";
import { TaxRequest } from "../infrastructure/tax.request";
import type { CreateTaxResult } from "../types/tax.types";

export class CreateTaxUseCase {
  static async execute(input: unknown): Promise<CreateTaxResult> {
    const parsed = CreateTaxFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const company = await CompanyRequest.getCurrent();
    if (!company?.id) {
      return {
        success: false,
        error: "Configura la empresa (con identificador válido) en Ajustes para crear impuestos.",
      };
    }
    const d = parsed.data;
    return TaxRequest.create({
      companyId: company.id,
      name: d.name.trim(),
      code: d.code ?? null,
      taxType: d.taxType,
      rate: d.rate,
      description: d.description ?? null,
      isDefault: d.isDefault,
      isActive: d.isActive,
    });
  }
}
