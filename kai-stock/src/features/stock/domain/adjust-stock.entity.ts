import { z } from "zod";

export const adjustStockInputSchema = z.object({
  variantId: z.string().uuid(),
  storageId: z.string().uuid(),
  currentQuantity: z.number().min(0),
  targetQuantity: z.number().min(0),
  note: z.string().trim().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;
