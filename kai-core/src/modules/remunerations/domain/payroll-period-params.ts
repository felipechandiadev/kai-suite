/**
 * Parámetros previsionales v1 (Chile / Ley 21.735).
 * Hardcodeados con nombres explícitos; override por company settings después.
 */
export type PayrollPeriodParams = {
  /** Tope imponible mensual (CLP). */
  taxableCapClp: number;
  /** Ingreso mínimo mensual (CLP). */
  minimumWageClp: number;
  /** Cotización obligatoria AFP trabajador (%). */
  afpMandatoryPercent: number;
  /** Salud Fonasa (%). */
  fonasaPercent: number;
  /** AFC trabajador contrato indefinido (%). */
  afcEmployeeIndefinitePercent: number;
  /** AFC trabajador plazo fijo (%). */
  afcEmployeeFixedTermPercent: number;
  /** AFC empleador indefinido (%). */
  afcEmployerIndefinitePercent: number;
  /** AFC empleador plazo fijo (%). */
  afcEmployerFixedTermPercent: number;
  /** SIS empleador (%). */
  sisEmployerPercent: number;
  /** Mutual / ISL base empleador (%). */
  mutualBasePercent: number;
  /** Cotización seguro social Ley 21.735 empleador (%). */
  socialSecurityEmployerPercent: number;
};

/** Tasas orientativas 2025–2026 (demo / v1). */
export const DEFAULT_PAYROLL_PERIOD_PARAMS: PayrollPeriodParams = {
  taxableCapClp: 3_200_000,
  minimumWageClp: 500_000,
  afpMandatoryPercent: 10,
  fonasaPercent: 7,
  afcEmployeeIndefinitePercent: 0.6,
  afcEmployeeFixedTermPercent: 0,
  afcEmployerIndefinitePercent: 2.4,
  afcEmployerFixedTermPercent: 3,
  sisEmployerPercent: 2.01,
  mutualBasePercent: 0.9,
  socialSecurityEmployerPercent: 1, // inició 1% en 2025
};

export function resolvePayrollPeriodParams(
  overrides?: Partial<PayrollPeriodParams> | null,
): PayrollPeriodParams {
  return { ...DEFAULT_PAYROLL_PERIOD_PARAMS, ...(overrides ?? {}) };
}
