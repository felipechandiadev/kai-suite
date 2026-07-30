import { z } from "zod";
import { METAL_TYPE_OPTIONS } from "../types/metal-price.types";

export const CreateMetalPriceFormSchema = z.object({
  metal: z.enum(METAL_TYPE_OPTIONS, { message: "Seleccione un metal válido" }),
  date: z.string().min(1, "La fecha es obligatoria"),
  valueCLP: z.number().positive("El valor debe ser mayor a cero"),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateMetalPriceFormInput = z.infer<typeof CreateMetalPriceFormSchema>;

export const UpdateMetalPriceFormSchema = z.object({
  id: z.string().uuid("Identificador no válido"),
  metal: z.enum(METAL_TYPE_OPTIONS, { message: "Seleccione un metal válido" }),
  date: z.string().min(1, "La fecha es obligatoria"),
  valueCLP: z.number().positive("El valor debe ser mayor a cero"),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateMetalPriceFormInput = z.infer<typeof UpdateMetalPriceFormSchema>;
