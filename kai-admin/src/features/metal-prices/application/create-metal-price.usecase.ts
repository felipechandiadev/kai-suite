import { CreateMetalPriceFormSchema } from "../domain/metal-price.entity";
import { MetalPriceRequest } from "../infrastructure/metal-price.request";
import type { CreateMetalPriceResult } from "../types/metal-price.types";

export class CreateMetalPriceUseCase {
  static async execute(input: unknown): Promise<CreateMetalPriceResult> {
    const parsed = CreateMetalPriceFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return MetalPriceRequest.create({
      metal: d.metal,
      date: d.date,
      valueCLP: d.valueCLP,
      notes: d.notes ?? null,
    });
  }
}
