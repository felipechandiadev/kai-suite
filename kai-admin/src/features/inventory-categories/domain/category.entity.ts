import { z } from "zod";

export const CreateCategoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  description: z
    .string()
    .max(5000)
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : undefined)),
  parentId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

/** Payload accepted by create (fields with Zod `.default()` may be omitted). */
export type CreateCategoryFormInput = z.input<typeof CreateCategoryFormSchema>;

export const UpdateCategoryFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  description: z
    .union([z.string().max(5000), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  parentId: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export type UpdateCategoryFormInput = z.infer<typeof UpdateCategoryFormSchema>;
