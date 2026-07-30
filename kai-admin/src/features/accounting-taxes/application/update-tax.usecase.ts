import { UpdateTaxFormSchema } from "../domain/tax.entity";
import { TaxRequest } from "../infrastructure/tax.request";
import type { UpdateTaxResult } from "../types/tax.types";

export class UpdateTaxUseCase {
  static async execute(input: unknown): Promise<UpdateTaxResult> {
    const parsed = UpdateTaxFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return TaxRequest.update(d.id, {
      name: d.name.trim(),
      code: d.code,
      taxType: d.taxType,
      rate: d.rate,
      description: d.description,
      isDefault: d.isDefault,
      isActive: d.isActive,
    });
  }
}
