import { z } from "zod";

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .optional()
  .nullable();

export const CreateBranchFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  location: locationSchema,
  isActive: z.boolean().optional().default(true),
  laborUnitIds: z.array(z.string().uuid()).optional(),
});

export type CreateBranchFormInput = z.infer<typeof CreateBranchFormSchema>;

export const UpdateBranchFormSchema = z.object({
  id: z.string().uuid("Identificador de sucursal no válido"),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  location: locationSchema,
  isActive: z.boolean().optional(),
  isHeadquarters: z.boolean().optional(),
  laborUnitIds: z.array(z.string().uuid()).optional(),
});

export type UpdateBranchFormInput = z.infer<typeof UpdateBranchFormSchema>;

export class BranchEntity {
  static validateCreateForm(data: unknown): CreateBranchFormInput {
    return CreateBranchFormSchema.parse(data);
  }
}
