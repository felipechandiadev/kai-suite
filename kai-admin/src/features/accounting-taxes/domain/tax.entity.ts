import { z } from "zod";
import { TAX_TYPES } from "../types/tax.types";

const taxTypeSchema = z.enum(TAX_TYPES);

export function parseTaxRateFromInput(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 999.99) {
    return null;
  }
  return n;
}

const rateFromInput = z.preprocess((val: unknown) => {
  if (val === "" || val == null) {
    return NaN;
  }
  const n = typeof val === "number" ? val : Number(String(val).replace(",", "."));
  return n;
}, z
  .number({ invalid_type_error: "Ingrese una tasa válida" })
  .refine((n) => Number.isFinite(n), "Ingrese una tasa válida")
  .refine((n) => n > 0, "La tasa debe ser mayor a 0%")
  .refine((n) => n <= 999.99, "Tasa fuera de rango"));

const optionalCode = z
  .string()
  .max(20)
  .optional()
  .transform((s) => (s && s.trim() ? s.trim() : undefined));

export const CreateTaxFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  code: optionalCode,
  taxType: taxTypeSchema,
  rate: rateFromInput,
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : undefined)),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type CreateTaxFormInput = z.input<typeof CreateTaxFormSchema>;

export const UpdateTaxFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  code: z
    .union([z.string().max(20), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  taxType: taxTypeSchema,
  rate: rateFromInput,
  description: z
    .union([z.string().max(2000), z.literal(""), z.null()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type UpdateTaxFormInput = z.input<typeof UpdateTaxFormSchema>;
