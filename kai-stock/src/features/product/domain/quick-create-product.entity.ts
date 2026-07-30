import { z } from "zod";

export const quickCreateProductInputSchema = z.object({
  productName: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  sku: z.string().trim().min(1, "El SKU es obligatorio").max(100),
  barcode: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  basePrice: z.coerce.number().min(0).optional(),
});

export type QuickCreateProductInput = z.infer<typeof quickCreateProductInputSchema>;
