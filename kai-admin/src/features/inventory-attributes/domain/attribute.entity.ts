import { z } from "zod";

export const CreateAttributeFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z
    .string()
    .max(5000)
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : undefined)),
  options: z
    .array(z.string().min(1, "Opción vacía").max(255))
    .min(1, "Debe agregar al menos una opción"),
});

export type CreateAttributeFormInput = z.input<typeof CreateAttributeFormSchema>;

export const UpdateAttributeFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z
    .union([z.string().max(5000), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  options: z
    .array(z.string().min(1, "Opción vacía").max(255))
    .min(1, "Debe haber al menos una opción"),
  isActive: z.boolean(),
});

export type UpdateAttributeFormInput = z.input<typeof UpdateAttributeFormSchema>;
