import { z } from "zod";
import { STORAGE_CATEGORIES, STORAGE_TYPES } from "../types/storage.types";

const typeSchema = z.enum(STORAGE_TYPES);
const categorySchema = z.enum(STORAGE_CATEGORIES);

const branchIdField = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalCapacityFromInput = z.preprocess((val: unknown) => {
  if (val === "" || val === null || val === undefined) {
    return undefined;
  }
  const n = typeof val === "number" ? val : Number(String(val).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}, z.number().min(0).optional());

const nullableCapacityFromInput = z.preprocess((val: unknown) => {
  if (val === "" || val === null || val === undefined) {
    return null;
  }
  const n = typeof val === "number" ? val : Number(String(val).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}, z.number().min(0).nullable());

const geoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const CreateStorageFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  code: z
    .string()
    .max(50)
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : undefined)),
  branchId: branchIdField,
  type: typeSchema,
  category: categorySchema,
  capacity: optionalCapacityFromInput,
  address: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : undefined)),
  location: geoPointSchema.nullable().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  laborUnitIds: z.array(z.string().uuid()).optional(),
});

export type CreateStorageFormInput = z.input<typeof CreateStorageFormSchema>;

export const UpdateStorageFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  code: z
    .string()
    .max(50)
    .transform((s) => (s.trim() === "" ? null : s.trim())),
  branchId: branchIdField,
  type: typeSchema,
  category: categorySchema,
  capacity: nullableCapacityFromInput,
  address: z
    .union([z.string().max(500), z.literal(""), z.null()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  location: geoPointSchema.nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  laborUnitIds: z.array(z.string().uuid()).optional(),
});

export type UpdateStorageFormInput = z.input<typeof UpdateStorageFormSchema>;
