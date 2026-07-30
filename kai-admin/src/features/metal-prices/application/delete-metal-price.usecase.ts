import { z } from "zod";
import { MetalPriceRequest } from "../infrastructure/metal-price.request";
import type { DeleteMetalPriceResult } from "../types/metal-price.types";

const DeleteSchema = z.object({
  id: z.string().uuid("Identificador no válido"),
});

export class DeleteMetalPriceUseCase {
  static async execute(input: unknown): Promise<DeleteMetalPriceResult> {
    const parsed = DeleteSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    return MetalPriceRequest.remove(parsed.data.id);
  }
}
