import { z } from "zod";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

export const CreateChartOfAccountFormSchema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(20),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  type: z.enum(ACCOUNT_TYPES),
  parentId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v))),
  isActive: z.boolean(),
});

export type CreateChartOfAccountFormInput = z.input<typeof CreateChartOfAccountFormSchema>;

