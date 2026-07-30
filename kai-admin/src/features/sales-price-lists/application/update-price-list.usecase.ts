import { UpdatePriceListFormSchema } from "../domain/price-list.entity";
import { PriceListRequest } from "../infrastructure/price-list.request";
import type { UpdatePriceListResult } from "../types/price-list.types";

export class UpdatePriceListUseCase {
  static async execute(input: unknown): Promise<UpdatePriceListResult> {
    const parsed = UpdatePriceListFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return PriceListRequest.update(d.id, {
      name: d.name,
      priceListType: d.priceListType,
      currency: "CLP",
      isActive: d.isActive !== false,
      isDefault: !!d.isDefault,
      description: d.description && String(d.description).trim() ? String(d.description).trim() : null,
    });
  }
}
