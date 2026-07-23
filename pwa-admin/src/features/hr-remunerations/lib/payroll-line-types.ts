export type PayrollLineCategory = "EARNING" | "DEDUCTION";

export const PAYROLL_EARNING_TYPE_IDS = [
  "ORDINARY",
  "PROPORTIONAL",
  "OVERTIME",
  "BONUS",
  "ALLOWANCE",
  "GRATIFICATION",
  "VIATICUM",
  "REFUND",
  "SUBSTITUTION",
  "INCENTIVE",
  "COMMISSION",
  "ADJUSTMENT_POS",
  "FEES",
  "SETTLEMENT",
  "INDEMNITY",
  "SPECIAL_SHIFT",
  "HOLIDAY",
  "NIGHT_SHIFT",
  "EXCEPTIONAL",
] as const;

export const PAYROLL_DEDUCTION_TYPE_IDS = [
  "AFP",
  "AFP_COMMISSION",
  "HEALTH_INSURANCE",
  "INCOME_TAX",
  "UNEMPLOYMENT_INSURANCE",
  "LOAN_PAYMENT",
  "ADVANCE_PAYMENT",
  "UNION_FEE",
  "COURT_ORDER",
  "DEDUCTION_EXTRA",
  "ADJUSTMENT_NEG",
] as const;

export type PayrollEarningTypeId = (typeof PAYROLL_EARNING_TYPE_IDS)[number];
export type PayrollDeductionTypeId = (typeof PAYROLL_DEDUCTION_TYPE_IDS)[number];
export type PayrollLineTypeId = PayrollEarningTypeId | PayrollDeductionTypeId;

export const PAYROLL_LINE_TYPE_LABELS: Record<string, string> = {
  ORDINARY: "Remuneración ordinaria",
  PROPORTIONAL: "Remuneración proporcional",
  OVERTIME: "Horas extraordinarias",
  BONUS: "Bono",
  ALLOWANCE: "Asignación",
  GRATIFICATION: "Gratificación",
  VIATICUM: "Viático",
  REFUND: "Reembolso de gastos",
  SUBSTITUTION: "Suplencia o reemplazo",
  INCENTIVE: "Incentivo o desempeño",
  COMMISSION: "Comisión",
  ADJUSTMENT_POS: "Ajuste o retroactivo (+)",
  FEES: "Pago de honorarios",
  SETTLEMENT: "Finiquito",
  INDEMNITY: "Indemnización",
  SPECIAL_SHIFT: "Pago por turno especial",
  HOLIDAY: "Pago por trabajo en festivo",
  NIGHT_SHIFT: "Pago por trabajo nocturno",
  EXCEPTIONAL: "Pago excepcional o extraordinario",
  AFP: "AFP (10% obligatorio)",
  AFP_COMMISSION: "Comisión AFP",
  HEALTH_INSURANCE: "Seguro de Salud",
  INCOME_TAX: "Impuesto a la Renta",
  UNEMPLOYMENT_INSURANCE: "Seguro de Cesantía",
  LOAN_PAYMENT: "Pago de Préstamo",
  ADVANCE_PAYMENT: "Anticipo de Sueldo",
  UNION_FEE: "Cuota Sindical",
  COURT_ORDER: "Descuento Judicial",
  DEDUCTION_EXTRA: "Descuento extraordinario",
  ADJUSTMENT_NEG: "Ajuste o retroactivo (-)",
};

export function labelPayrollLineType(typeId: string): string {
  return PAYROLL_LINE_TYPE_LABELS[typeId] ?? typeId;
}

export function payrollLineCategory(typeId: string): PayrollLineCategory {
  return PAYROLL_DEDUCTION_TYPE_IDS.includes(typeId as PayrollDeductionTypeId)
    ? "DEDUCTION"
    : "EARNING";
}

export function earningTypeOptions() {
  return PAYROLL_EARNING_TYPE_IDS.map((id) => ({
    id,
    label: PAYROLL_LINE_TYPE_LABELS[id],
  }));
}

export function deductionTypeOptions() {
  return PAYROLL_DEDUCTION_TYPE_IDS.map((id) => ({
    id,
    label: PAYROLL_LINE_TYPE_LABELS[id],
  }));
}

export function isPayrollLineTypeId(typeId: string): typeId is PayrollLineTypeId {
  return (
    PAYROLL_EARNING_TYPE_IDS.includes(typeId as PayrollEarningTypeId) ||
    PAYROLL_DEDUCTION_TYPE_IDS.includes(typeId as PayrollDeductionTypeId)
  );
}
