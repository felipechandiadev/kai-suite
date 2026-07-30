import { z } from "zod";

export const updateBarcodeInputSchema = z.object({
  variantId: z.string().uuid("Variante inválida"),
  barcode: z
    .string()
    .trim()
    .min(1, "Código de barras requerido")
    .max(64, "Código demasiado largo"),
});

export type UpdateBarcodeInput = z.infer<typeof updateBarcodeInputSchema>;
