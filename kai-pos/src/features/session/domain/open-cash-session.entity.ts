import { z } from "zod";

export const OpenCashSessionSchema = z
  .object({
    pointOfSaleId: z.string().uuid(),
    openingAmount: z.coerce.number().min(0),
    cashHubId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.openingAmount > 0 && !data.cashHubId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccione un centro de efectivo.",
        path: ["cashHubId"],
      });
    }
  });

export type OpenCashSessionInput = z.input<typeof OpenCashSessionSchema>;
export type OpenCashSessionData = z.output<typeof OpenCashSessionSchema>;

