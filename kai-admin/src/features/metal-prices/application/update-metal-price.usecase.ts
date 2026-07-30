import { UpdateMetalPriceFormSchema } from "../domain/metal-price.entity";
import { MetalPriceRequest } from "../infrastructure/metal-price.request";
import type { UpdateMetalPriceResult } from "../types/metal-price.types";

export class UpdateMetalPriceUseCase {
  static async execute(input: unknown): Promise<UpdateMetalPriceResult> {
    const parsed = UpdateMetalPriceFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return MetalPriceRequest.update(d.id, {
      metal: d.metal,
      date: d.date,
      valueCLP: d.valueCLP,
      notes: d.notes ?? null,
    });
  }
}
