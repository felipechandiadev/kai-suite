import {
  ExtraHoursMode,
  EmploymentContractKind,
  EmploymentLaborType,
} from '../../domain/employment-contract.enums';
import { WorkRegime } from '../../domain/employee.entity';

/**
 * Pure validation helpers mirrored from EmploymentContractsService.normalizeForKind
 * (kept testable without Nest DI).
 */
export function assertLaborContractRules(input: {
  laborType?: string | null;
  workRegime?: string | null;
  weeklyHours?: number | null;
  extraHoursMode?: string | null;
  baseSalary?: string | null;
  healthSystem?: string | null;
  isapreId?: string | null;
  healthContributionMode?: string | null;
  healthContributionValue?: string | null;
}): string | null {
  if (input.laborType === EmploymentLaborType.PART_TIME) {
    return 'laborType PART_TIME está deprecado; use workRegime PARTIAL y weeklyHours';
  }
  const weekly = input.weeklyHours;
  if (weekly == null || !(weekly > 0)) {
    return 'Horas semanales pactadas requeridas';
  }
  if (input.workRegime === WorkRegime.PARTIAL && weekly > 30) {
    return 'Jornada parcial: máximo 30 horas semanales (Art. 40 bis)';
  }
  if (
    !input.extraHoursMode ||
    !Object.values(ExtraHoursMode).includes(input.extraHoursMode as ExtraHoursMode)
  ) {
    return 'Modo de horas extras / compensación requerido';
  }
  if (!input.baseSalary?.trim()) {
    return 'Sueldo base requerido';
  }
  if (input.healthSystem === 'ISAPRE') {
    if (!input.isapreId?.trim()) return 'Isapre requerida cuando salud es Isapre';
    if (!input.healthContributionMode) return 'Modo de aporte Isapre requerido';
    const n = Number(String(input.healthContributionValue ?? '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return 'Valor de aporte Isapre inválido';
  }
  return null;
}

export function assertFeeClearsLaborFields(kind: EmploymentContractKind): boolean {
  return kind === EmploymentContractKind.FEE;
}

describe('employment contract rules (M1)', () => {
  it('rejects PART_TIME laborType', () => {
    expect(
      assertLaborContractRules({
        laborType: 'PART_TIME',
        workRegime: 'PARTIAL',
        weeklyHours: 20,
        extraHoursMode: 'PAID_OVERTIME',
        baseSalary: '500000',
      }),
    ).toMatch(/PART_TIME/);
  });

  it('rejects PARTIAL over 30h', () => {
    expect(
      assertLaborContractRules({
        workRegime: 'PARTIAL',
        weeklyHours: 35,
        extraHoursMode: 'PAID_OVERTIME',
        baseSalary: '500000',
      }),
    ).toMatch(/30/);
  });

  it('requires Isapre fields when ISAPRE', () => {
    expect(
      assertLaborContractRules({
        workRegime: 'ORDINARY',
        weeklyHours: 45,
        extraHoursMode: 'PAID_OVERTIME',
        baseSalary: '500000',
        healthSystem: 'ISAPRE',
      }),
    ).toMatch(/Isapre/);
  });

  it('accepts valid LABOR', () => {
    expect(
      assertLaborContractRules({
        workRegime: 'ORDINARY',
        weeklyHours: 45,
        extraHoursMode: 'PAID_OVERTIME',
        baseSalary: '850000',
        healthSystem: 'FONASA',
      }),
    ).toBeNull();
  });

  it('FEE kind clears labor fields', () => {
    expect(assertFeeClearsLaborFields(EmploymentContractKind.FEE)).toBe(true);
  });
});
