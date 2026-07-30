import { z } from "zod";

export const transferStockInputSchema = z
  .object({
    variantId: z.string().uuid(),
    sourceStorageId: z.string().uuid(),
    targetStorageId: z.string().uuid(),
    quantity: z.number().positive("Cantidad debe ser mayor a 0"),
    note: z.string().trim().optional(),
  })
  .refine((d) => d.sourceStorageId !== d.targetStorageId, {
    message: "Origen y destino deben ser distintos",
    path: ["targetStorageId"],
  });

export type TransferStockInput = z.infer<typeof transferStockInputSchema>;
