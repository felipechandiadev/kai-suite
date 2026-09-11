import { z } from "zod";

export const pricingCalculateInputSchema = z.object({
  weekIso: z.string().trim().max(10).optional(),
  priceListId: z.string().uuid("Lista de precios inválida"),
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  targetMarginPercent: z.number().min(0).max(99).optional(),
  salesWindowWeekIso: z.string().trim().max(10).optional(),
});

export type PricingCalculateInputValidated = z.infer<typeof pricingCalculateInputSchema>;

export const pricingApplySnapshotSchema = z.object({
  snapshotId: z.string().uuid("Snapshot inválido"),
});
