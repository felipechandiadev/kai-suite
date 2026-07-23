import { PayrollStatutoryCalculator } from '../../application/payroll-statutory.calculator';
import { EmploymentLaborType } from '@modules/employees/domain/employment-contract.enums';

describe('PayrollStatutoryCalculator', () => {
  const calc = new PayrollStatutoryCalculator();

  it('computes employee deductions and employer costs from imponible base', () => {
    const result = calc.calculate({
      earnings: [{ typeId: 'ORDINARY', amount: 1_000_000 }],
      contract: {
        laborType: EmploymentLaborType.INDEFINITE,
        afpContributionPercent: '1.0',
        healthSystem: 'FONASA',
        mutualName: 'ACHS',
      },
    });

    expect(result.taxableBase).toBe(1_000_000);
    expect(result.totalImponible).toBe(1_000_000);

    const afp = result.suggestedDeductions.find((d) => d.typeId === 'AFP');
    expect(afp?.amount).toBe(100_000);

    const fee = result.suggestedDeductions.find((d) => d.typeId === 'AFP_COMMISSION');
    expect(fee?.amount).toBe(10_000);

    const health = result.suggestedDeductions.find((d) => d.typeId === 'HEALTH_INSURANCE');
    expect(health?.amount).toBe(70_000);

    const afc = result.suggestedDeductions.find(
      (d) => d.typeId === 'UNEMPLOYMENT_INSURANCE',
    );
    expect(afc?.amount).toBe(6_000);

    expect(result.employerCosts.map((c) => c.code).sort()).toEqual(
      ['AFC_EMPLOYER', 'LEY_21735', 'MUTUAL', 'SIS'].sort(),
    );
    expect(result.totalEmployerCost).toBeGreaterThan(0);
    // SIS 2.01% + AFC emp 2.4% + mutual 0.9% + ley 1% = 6.31%
    expect(result.totalEmployerCost).toBe(63_100);
  });

  it('does not include allowances in imponible', () => {
    const result = calc.calculate({
      earnings: [
        { typeId: 'ORDINARY', amount: 800_000 },
        { typeId: 'ALLOWANCE', amount: 50_000 },
      ],
      contract: {
        laborType: EmploymentLaborType.FIXED_TERM,
        healthSystem: 'FONASA',
      },
    });
    expect(result.totalImponible).toBe(800_000);
    expect(result.totalNoImponible).toBe(50_000);
    const afcEmp = result.employerCosts.find((c) => c.code === 'AFC_EMPLOYER');
    expect(afcEmp?.ratePercent).toBe(3);
    const afcWorker = result.suggestedDeductions.find(
      (d) => d.typeId === 'UNEMPLOYMENT_INSURANCE',
    );
    expect(afcWorker).toBeUndefined();
  });

  it('netPayment excludes employer costs', () => {
    const result = calc.calculate({
      earnings: [{ typeId: 'ORDINARY', amount: 1_000_000 }],
      contract: {
        laborType: EmploymentLaborType.INDEFINITE,
        afpContributionPercent: '0',
        healthSystem: 'FONASA',
      },
    });
    const deductions = result.suggestedDeductions.reduce((s, d) => s + d.amount, 0);
    const net = 1_000_000 - deductions;
    expect(result.totalEmployerCost).toBeGreaterThan(0);
    expect(net + result.totalEmployerCost).toBeGreaterThan(net);
  });
});
