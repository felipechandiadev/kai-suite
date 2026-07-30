import { z } from "zod";

const typeSchema = z.enum(["RETAIL", "WHOLESALE", "VIP", "PROMOTIONAL"]);

export const CreatePriceListFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  priceListType: typeSchema,
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  description: z.string().max(2000).optional().nullable(),
});

export type CreatePriceListFormInput = z.infer<typeof CreatePriceListFormSchema>;

export const UpdatePriceListFormSchema = z.object({
  id: z.string().uuid("Identificador de lista no válido"),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  priceListType: typeSchema,
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  description: z.string().max(2000).optional().nullable(),
});

export type UpdatePriceListFormInput = z.infer<typeof UpdatePriceListFormSchema>;
