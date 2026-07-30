import type { RuleScope } from "@/features/accounting-rules/types/accounting-rule.types";
import { TRANSACTION_TYPE_OPTIONS as TRANSACTION_TYPES } from "@/features/transactions/types/transaction-types";

export const RULE_SCOPE_OPTIONS: { id: RuleScope; label: string }[] = [
  { id: "TRANSACTION", label: "Transacción (cabecera)" },
  { id: "TRANSACTION_LINE", label: "Línea de transacción (ítem)" },
];

export const PAYMENT_METHOD_OPTIONS: { id: string; label: string }[] = [
  { id: "", label: "Cualquier método" },
  { id: "CASH", label: "Efectivo" },
  { id: "CREDIT_CARD", label: "Tarjeta de crédito" },
  { id: "DEBIT_CARD", label: "Tarjeta de débito" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
  { id: "CREDIT", label: "Crédito" },
  { id: "INTERNAL_CREDIT", label: "Crédito interno" },
];

export const RULE_LINE_SIDE_OPTIONS: { id: string; label: string }[] = [
  { id: "DEBIT", label: "Debe" },
  { id: "CREDIT", label: "Haber" },
];

export const RULE_LINE_AMOUNT_MODE_OPTIONS: { id: string; label: string }[] = [
  { id: "TOTAL", label: "Total" },
  { id: "SUBTOTAL", label: "Subtotal" },
  { id: "TAX", label: "Impuestos" },
  { id: "DISCOUNT", label: "Descuento" },
  { id: "FIXED", label: "Monto fijo" },
];

export const TRANSACTION_TYPE_OPTIONS: { id: string; label: string }[] = TRANSACTION_TYPES.map((t) => ({
  id: t.id,
  label: `${t.label} (${t.id})`,
}));

