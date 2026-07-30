import { CreatePriceListFormSchema } from "../domain/price-list.entity";
import { PriceListRequest } from "../infrastructure/price-list.request";
import type { CreatePriceListResult } from "../types/price-list.types";

export class CreatePriceListUseCase {
  static async execute(input: unknown): Promise<CreatePriceListResult> {
    const parsed = CreatePriceListFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return PriceListRequest.create({
      name: d.name,
      priceListType: d.priceListType,
      currency: "CLP",
      isActive: d.isActive !== false,
      isDefault: !!d.isDefault,
      description: d.description && String(d.description).trim() ? String(d.description).trim() : null,
    });
  }
}
