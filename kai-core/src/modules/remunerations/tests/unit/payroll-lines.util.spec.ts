import { BadRequestException } from '@nestjs/common';
import {
  calculatePayrollTotals,
  getPayrollLineTypeLabel,
  normalizePayrollLineTypeId,
} from '@modules/remunerations/application/payroll-lines.util';
import { PayrollLineCategory } from '@modules/remunerations/domain/payroll-line-type.enum';

describe('payroll-lines.util', () => {
  it('calculates totals from earnings and deductions', () => {
    const result = calculatePayrollTotals([
      { typeId: 'ORDINARY', amount: 1_000_000 },
      { typeId: 'BONUS', amount: 100_000 },
      { typeId: 'AFP', amount: 110_000 },
      { typeId: 'HEALTH_INSURANCE', amount: 70_000 },
    ]);

    expect(result.totalEarnings).toBe(1_100_000);
    expect(result.totalDeductions).toBe(180_000);
    expect(result.netPayment).toBe(920_000);
    expect(result.normalizedLines).toHaveLength(4);
    expect(result.normalizedLines[0]?.category).toBe(PayrollLineCategory.EARNING);
    expect(result.normalizedLines[2]?.category).toBe(PayrollLineCategory.DEDUCTION);
  });

  it('maps legacy BASE_SALARY to ORDINARY', () => {
    const typeId = normalizePayrollLineTypeId('BASE_SALARY');
    expect(typeId).toBe('ORDINARY');
    expect(getPayrollLineTypeLabel('BASE_SALARY')).toBe('Sueldo base');
  });

  it('rejects invalid typeId', () => {
    expect(() => normalizePayrollLineTypeId('INVALID')).toThrow(BadRequestException);
  });

  it('rejects negative net payment', () => {
    expect(() =>
      calculatePayrollTotals([
        { typeId: 'ORDINARY', amount: 100_000 },
        { typeId: 'AFP', amount: 150_000 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('requires at least one earning line', () => {
    expect(() =>
      calculatePayrollTotals([{ typeId: 'AFP', amount: 10_000 }]),
    ).toThrow(BadRequestException);
  });
});
