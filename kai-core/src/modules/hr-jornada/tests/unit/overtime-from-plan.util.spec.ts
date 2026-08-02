import {
  calendarMonthBounds,
  clampDailyOvertime,
  durationMinutes,
  excessOverBandMinutes,
  shouldMaterializePaidOvertime,
  weeksInMonth,
} from '../../domain/rules/overtime-from-plan.util';

describe('overtime-from-plan.util', () => {
  it('excessOverBandMinutes', () => {
    expect(excessOverBandMinutes('09:00', '15:00', '09:00', '14:00')).toBe(60);
    expect(excessOverBandMinutes('09:00', '14:00', '09:00', '14:00')).toBe(0);
  });

  it('durationMinutes overnight', () => {
    expect(durationMinutes('22:00', '06:00')).toBe(8 * 60);
  });

  it('clampDailyOvertime', () => {
    expect(clampDailyOvertime(180, 120)).toBe(120);
    expect(clampDailyOvertime(-10, 120)).toBe(0);
  });

  it('shouldMaterializePaidOvertime', () => {
    expect(shouldMaterializePaidOvertime('PAID_OVERTIME', true)).toBe(true);
    expect(shouldMaterializePaidOvertime('NONE', true)).toBe(false);
    expect(shouldMaterializePaidOvertime('PAID_OVERTIME', false)).toBe(false);
    expect(shouldMaterializePaidOvertime('COMPENSATORY_REST', true)).toBe(false);
  });

  it('calendarMonthBounds', () => {
    expect(calendarMonthBounds('2026-07-27')).toEqual({
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
    });
  });

  it('weeksInMonth', () => {
    expect(weeksInMonth('2026-07-01', '2026-07-31')).toBeCloseTo(31 / 7, 5);
  });
});
