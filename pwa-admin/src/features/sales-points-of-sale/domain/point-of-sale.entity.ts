import { z } from "zod";

const posPriceListEntry = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
});

const posKindSchema = z.enum(["PRESALE", "SALE"]).default("SALE");

/** Alineado a `PointOfSale` y `PosService.createPointOfSale` (name, branchId, storageId, deviceId, isActive, priceLists, defaultPriceListId). */
export const CreatePointOfSaleFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(255),
    branchId: z.string().uuid("Debe elegir una sucursal"),
    storageId: z.string().uuid("Debe elegir la sala de venta (almacén)"),
    deviceId: z
      .string()
      .max(100)
      .default("")
      .transform((s) => (s.trim() ? s.trim() : null)),
    isActive: z.boolean().default(true),
    priceLists: z.array(posPriceListEntry).default([]),
    defaultPriceListId: z.string().uuid().nullable().optional(),
    kind: posKindSchema,
    acceptsPresaleTickets: z.boolean().default(false),
    allowsDeferredPayment: z.boolean().default(false),
  })
  .refine(
    (d) => {
      if (d.defaultPriceListId == null || d.defaultPriceListId === undefined) {
        return true;
      }
      return d.priceLists.some((p) => p.id === d.defaultPriceListId);
    },
    { message: "La lista de precio por defecto debe estar entre las listas asignadas", path: ["defaultPriceListId"] },
  );

export type CreatePointOfSaleFormInput = z.infer<typeof CreatePointOfSaleFormSchema>;

export const UpdatePointOfSaleFormSchema = z
  .object({
    id: z.string().uuid("Identificador de punto de venta no válido"),
    name: z.string().min(1, "El nombre es obligatorio").max(255),
    branchId: z.string().uuid("Debe elegir una sucursal"),
    storageId: z.string().uuid("Debe elegir la sala de venta (almacén)"),
    deviceId: z
      .union([z.string().max(100), z.null(), z.undefined()])
      .transform((v) => (v == null || v === "" || !String(v).trim() ? null : String(v).trim())),
    isActive: z.boolean().optional().default(true),
    priceLists: z.array(posPriceListEntry).default([]),
    defaultPriceListId: z.string().uuid().nullable().optional(),
    kind: posKindSchema,
    acceptsPresaleTickets: z.boolean().default(false),
    allowsDeferredPayment: z.boolean().default(false),
  })
  .refine(
    (d) => {
      if (d.defaultPriceListId == null || d.defaultPriceListId === undefined) {
        return true;
      }
      return d.priceLists.some((p) => p.id === d.defaultPriceListId);
    },
    { message: "La lista de precio por defecto debe estar entre las listas asignadas", path: ["defaultPriceListId"] },
  );

export type UpdatePointOfSaleFormInput = z.infer<typeof UpdatePointOfSaleFormSchema>;

export class PointOfSaleEntity {
  static validateCreateForm(data: unknown): CreatePointOfSaleFormInput {
    return CreatePointOfSaleFormSchema.parse(data);
  }
}
