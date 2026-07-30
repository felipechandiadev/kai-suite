import { z } from "zod";
import { UNIT_DIMENSIONS } from "../types/unit.types";

const dimensionSchema = z.enum(UNIT_DIMENSIONS);

export const CreateUnitFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(100),
    symbol: z.string().min(1, "El símbolo es obligatorio").max(10),
    dimension: dimensionSchema,
    conversionFactor: z.coerce.number().positive("El factor debe ser mayor que 0"),
    isBase: z.boolean(),
    baseUnitId: z
      .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v === "" || v == null ? undefined : v)),
    allowDecimals: z.boolean(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isBase) {
      if (data.conversionFactor !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La unidad base debe tener factor 1",
          path: ["conversionFactor"],
        });
      }
      return;
    }
    if (!data.baseUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una unidad base",
        path: ["baseUnitId"],
      });
    }
  });

export type CreateUnitFormInput = z.input<typeof CreateUnitFormSchema>;

export const UpdateUnitFormSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, "El nombre es obligatorio").max(100),
    symbol: z.string().min(1, "El símbolo es obligatorio").max(10),
    dimension: dimensionSchema,
    conversionFactor: z.coerce.number().positive("El factor debe ser mayor que 0"),
    isBase: z.boolean(),
    baseUnitId: z
      .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v === "" || v == null ? undefined : v)),
    allowDecimals: z.boolean(),
    active: z.boolean(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isDefault && !data.active) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La unidad predeterminada debe estar activa",
        path: ["isDefault"],
      });
    }
    if (data.isBase) {
      if (data.conversionFactor !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La unidad base debe tener factor 1",
          path: ["conversionFactor"],
        });
      }
      return;
    }
    if (!data.baseUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una unidad base",
        path: ["baseUnitId"],
      });
    }
  });

export type UpdateUnitFormInput = z.input<typeof UpdateUnitFormSchema>;
