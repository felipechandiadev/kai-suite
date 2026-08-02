export enum PayrollLineCategory {
  EARNING = 'EARNING',
  DEDUCTION = 'DEDUCTION',
}

/** Tipos de línea de liquidación de sueldo (haberes). */
export enum PayrollEarningTypeId {
  ORDINARY = 'ORDINARY',
  PROPORTIONAL = 'PROPORTIONAL',
  OVERTIME = 'OVERTIME',
  BONUS = 'BONUS',
  ALLOWANCE = 'ALLOWANCE',
  GRATIFICATION = 'GRATIFICATION',
  VIATICUM = 'VIATICUM',
  REFUND = 'REFUND',
  SUBSTITUTION = 'SUBSTITUTION',
  INCENTIVE = 'INCENTIVE',
  COMMISSION = 'COMMISSION',
  ADJUSTMENT_POS = 'ADJUSTMENT_POS',
  FEES = 'FEES',
  SETTLEMENT = 'SETTLEMENT',
  INDEMNITY = 'INDEMNITY',
  SPECIAL_SHIFT = 'SPECIAL_SHIFT',
  HOLIDAY = 'HOLIDAY',
  NIGHT_SHIFT = 'NIGHT_SHIFT',
  EXCEPTIONAL = 'EXCEPTIONAL',
  /** Propina enterada vía liquidación (no imponible; custodia Art. 64). */
  TIP = 'TIP',
}

/** Tipos de línea de liquidación de sueldo (descuentos). */
export enum PayrollDeductionTypeId {
  AFP = 'AFP',
  /** Comisión AFP (sobre imponible; distinta del 10% obligatorio). */
  AFP_COMMISSION = 'AFP_COMMISSION',
  HEALTH_INSURANCE = 'HEALTH_INSURANCE',
  INCOME_TAX = 'INCOME_TAX',
  UNEMPLOYMENT_INSURANCE = 'UNEMPLOYMENT_INSURANCE',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
  ADVANCE_PAYMENT = 'ADVANCE_PAYMENT',
  UNION_FEE = 'UNION_FEE',
  COURT_ORDER = 'COURT_ORDER',
  DEDUCTION_EXTRA = 'DEDUCTION_EXTRA',
  ADJUSTMENT_NEG = 'ADJUSTMENT_NEG',
}

/** Alias legacy en datos históricos / contabilidad. */
export const PAYROLL_LINE_TYPE_LEGACY_ALIASES: Record<string, PayrollEarningTypeId> = {
  BASE_SALARY: PayrollEarningTypeId.ORDINARY,
};

export type PayrollLineTypeId =
  | PayrollEarningTypeId
  | PayrollDeductionTypeId;

const EARNING_TYPE_IDS = new Set<string>(Object.values(PayrollEarningTypeId));
const DEDUCTION_TYPE_IDS = new Set<string>(Object.values(PayrollDeductionTypeId));
const ALL_TYPE_IDS = new Set<string>([
  ...EARNING_TYPE_IDS,
  ...DEDUCTION_TYPE_IDS,
]);

export const PAYROLL_LINE_TYPE_LABELS: Record<string, string> = {
  [PayrollEarningTypeId.ORDINARY]: 'Remuneración ordinaria',
  [PayrollEarningTypeId.PROPORTIONAL]: 'Remuneración proporcional',
  [PayrollEarningTypeId.OVERTIME]: 'Horas extraordinarias',
  [PayrollEarningTypeId.BONUS]: 'Bono',
  [PayrollEarningTypeId.ALLOWANCE]: 'Asignación',
  [PayrollEarningTypeId.GRATIFICATION]: 'Gratificación',
  [PayrollEarningTypeId.VIATICUM]: 'Viático',
  [PayrollEarningTypeId.REFUND]: 'Reembolso de gastos',
  [PayrollEarningTypeId.SUBSTITUTION]: 'Suplencia o reemplazo',
  [PayrollEarningTypeId.INCENTIVE]: 'Incentivo o desempeño',
  [PayrollEarningTypeId.COMMISSION]: 'Comisión',
  [PayrollEarningTypeId.ADJUSTMENT_POS]: 'Ajuste o retroactivo (+)',
  [PayrollEarningTypeId.FEES]: 'Pago de honorarios',
  [PayrollEarningTypeId.SETTLEMENT]: 'Finiquito',
  [PayrollEarningTypeId.INDEMNITY]: 'Indemnización',
  [PayrollEarningTypeId.SPECIAL_SHIFT]: 'Pago por turno especial',
  [PayrollEarningTypeId.HOLIDAY]: 'Pago por trabajo en festivo',
  [PayrollEarningTypeId.NIGHT_SHIFT]: 'Pago por trabajo nocturno',
  [PayrollEarningTypeId.EXCEPTIONAL]: 'Pago excepcional o extraordinario',
  [PayrollEarningTypeId.TIP]: 'Propinas',
  [PayrollDeductionTypeId.AFP]: 'AFP (10% obligatorio)',
  [PayrollDeductionTypeId.AFP_COMMISSION]: 'Comisión AFP',
  [PayrollDeductionTypeId.HEALTH_INSURANCE]: 'Seguro de Salud',
  [PayrollDeductionTypeId.INCOME_TAX]: 'Impuesto a la Renta',
  [PayrollDeductionTypeId.UNEMPLOYMENT_INSURANCE]: 'Seguro de Cesantía',
  [PayrollDeductionTypeId.LOAN_PAYMENT]: 'Pago de Préstamo',
  [PayrollDeductionTypeId.ADVANCE_PAYMENT]: 'Anticipo de Sueldo',
  [PayrollDeductionTypeId.UNION_FEE]: 'Cuota Sindical',
  [PayrollDeductionTypeId.COURT_ORDER]: 'Descuento Judicial',
  [PayrollDeductionTypeId.DEDUCTION_EXTRA]: 'Descuento extraordinario',
  [PayrollDeductionTypeId.ADJUSTMENT_NEG]: 'Ajuste o retroactivo (-)',
  BASE_SALARY: 'Sueldo base',
};
