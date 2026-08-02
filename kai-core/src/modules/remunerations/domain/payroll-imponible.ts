import {
  PayrollDeductionTypeId,
  PayrollEarningTypeId,
  type PayrollLineTypeId,
} from './payroll-line-type.enum';

/** Haberes que entran a base imponible (mapa estático v1). */
const IMPONIBLE_EARNINGS = new Set<string>([
  PayrollEarningTypeId.ORDINARY,
  PayrollEarningTypeId.PROPORTIONAL,
  PayrollEarningTypeId.OVERTIME,
  PayrollEarningTypeId.BONUS,
  PayrollEarningTypeId.GRATIFICATION,
  PayrollEarningTypeId.SUBSTITUTION,
  PayrollEarningTypeId.INCENTIVE,
  PayrollEarningTypeId.COMMISSION,
  PayrollEarningTypeId.ADJUSTMENT_POS,
  PayrollEarningTypeId.SPECIAL_SHIFT,
  PayrollEarningTypeId.HOLIDAY,
  PayrollEarningTypeId.NIGHT_SHIFT,
  PayrollEarningTypeId.EXCEPTIONAL,
]);

/** Haberes típicamente no imponibles. */
const NO_IMPONIBLE_EARNINGS = new Set<string>([
  PayrollEarningTypeId.ALLOWANCE,
  PayrollEarningTypeId.VIATICUM,
  PayrollEarningTypeId.REFUND,
  PayrollEarningTypeId.INDEMNITY,
  PayrollEarningTypeId.SETTLEMENT,
  PayrollEarningTypeId.FEES,
  PayrollEarningTypeId.TIP,
]);

export function isPayrollEarningImponible(typeId: string): boolean {
  if (NO_IMPONIBLE_EARNINGS.has(typeId)) return false;
  if (IMPONIBLE_EARNINGS.has(typeId)) return true;
  // default: earning desconocido = imponible
  return true;
}

export function isStatutoryEmployeeDeduction(typeId: string): boolean {
  return (
    typeId === PayrollDeductionTypeId.AFP ||
    typeId === PayrollDeductionTypeId.AFP_COMMISSION ||
    typeId === PayrollDeductionTypeId.HEALTH_INSURANCE ||
    typeId === PayrollDeductionTypeId.UNEMPLOYMENT_INSURANCE ||
    typeId === PayrollDeductionTypeId.INCOME_TAX
  );
}

export type PayrollEmployerCostCode =
  | 'SIS'
  | 'AFC_EMPLOYER'
  | 'MUTUAL'
  | 'LEY_21735';

export type PayrollEmployerCost = {
  code: PayrollEmployerCostCode;
  label: string;
  ratePercent: number;
  base: number;
  amount: number;
};

export type PayrollStatutorySuggestionLine = {
  typeId: PayrollLineTypeId;
  amount: number;
  label?: string;
  ratePercent?: number;
  base?: number;
};
