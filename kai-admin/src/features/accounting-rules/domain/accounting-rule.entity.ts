import { z } from "zod";

export const RULE_SCOPES = ["TRANSACTION", "TRANSACTION_LINE"] as const;
const ruleScopeSchema = z.enum(RULE_SCOPES);

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v == null || String(v).trim() === "" ? null : String(v)));

const optionalString = z
  .union([z.string(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v == null || String(v).trim() === "" ? null : String(v)));

const numberFromInput = z.preprocess((val: unknown) => {
  if (val === "" || val == null) return NaN;
  const n = typeof val === "number" ? val : Number(String(val));
  return n;
}, z.number().int("La prioridad debe ser un número entero"));

export const CreateAccountingRuleFormSchema = z.object({
  appliesTo: ruleScopeSchema,
  transactionType: z.string().min(1, "El tipo de transacción es obligatorio"),
  expenseCategoryId: optionalUuid,
  taxId: optionalUuid,
  paymentMethod: optionalString,
  debitAccountId: z.string().uuid("Selecciona una cuenta de débito"),
  creditAccountId: z.string().uuid("Selecciona una cuenta de crédito"),
  priority: numberFromInput,
  isActive: z.boolean(),
});

export type CreateAccountingRuleFormInput = z.input<typeof CreateAccountingRuleFormSchema>;

export const UpdateAccountingRuleFormSchema = z.object({
  id: z.string().uuid(),
  expenseCategoryId: optionalUuid,
  taxId: optionalUuid,
  paymentMethod: optionalString,
  debitAccountId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v))),
  creditAccountId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v == null || String(v).trim() === "" ? null : String(v))),
  priority: z
    .preprocess((val: unknown) => {
      if (val === "" || val == null) return undefined;
      const n = typeof val === "number" ? val : Number(String(val));
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().optional()),
  isActive: z.boolean().optional(),
});

export type UpdateAccountingRuleFormInput = z.input<typeof UpdateAccountingRuleFormSchema>;

