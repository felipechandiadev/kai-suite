import {
  durationMinutes,
  evaluateDailyOvertime,
  evaluateOverlap,
  evaluateRestBetweenShifts,
  evaluateSchedule,
  evaluateWeeklyCapPerEmployee,
  hourlyRateCents,
  overtimeAmountCents,
} from '../../domain/rules/rules-engine';
import { FindingSeverity } from '../../domain/hr-jornada.enums';

describe('hr-jornada rules-engine', () => {
  const baseConfig = {
    maxDailyOvertimeMinutes: 120,
    minRestBetweenShiftsMinutes: 660,
    maxWeeklyMinutes: null as number | null,
    maxMonthlyMinutes: null as number | null,
    allowShiftOverlap: false,
    nightStart: '21:00',
    nightEnd: '07:00',
  };

  it('durationMinutes handles overnight', () => {
    expect(durationMinutes('22:00', '06:00')).toBe(8 * 60);
    expect(durationMinutes('09:00', '18:00')).toBe(9 * 60);
  });

  it('flags OT over 2h/day as CRITICAL LEGAL', () => {
    const findings = evaluateDailyOvertime(
      [
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 180,
        },
      ],
      120,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleCode).toBe('OT_DAILY_MAX');
    expect(findings[0].severity).toBe(FindingSeverity.CRITICAL);
    expect(findings[0].message).toContain('Art. 31');
  });

  it('detects same-day overlap', () => {
    const findings = evaluateOverlap(
      [
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '09:00',
          endTime: '14:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '13:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
      ],
      false,
    );
    expect(findings.some((f) => f.ruleCode === 'SHIFT_OVERLAP')).toBe(true);
  });

  it('detects insufficient rest between shifts', () => {
    const findings = evaluateRestBetweenShifts(
      [
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '14:00',
          endTime: '22:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-14',
          startTime: '06:00',
          endTime: '14:00',
          plannedOvertimeMinutes: 0,
        },
      ],
      660,
    );
    expect(findings.some((f) => f.ruleCode === 'REST_BETWEEN_SHIFTS')).toBe(
      true,
    );
  });

  it('evaluateSchedule aggregates findings', () => {
    const findings = evaluateSchedule(
      [
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 150,
          compensatoryBalanceMinutes: 60,
        },
      ],
      baseConfig,
    );
    expect(findings.some((f) => f.ruleCode === 'OT_DAILY_MAX')).toBe(true);
    expect(findings.some((f) => f.ruleCode === 'COMPENSATORY_VS_OT')).toBe(
      true,
    );
  });

  it('weekly cap names the employee and excess hours', () => {
    const findings = evaluateWeeklyCapPerEmployee(
      [
        {
          employeeId: 'e1',
          workDate: '2026-07-13',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-14',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-15',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-16',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-17',
          startTime: '09:00',
          endTime: '18:00',
          plannedOvertimeMinutes: 0,
        },
        {
          employeeId: 'e1',
          workDate: '2026-07-18',
          startTime: '09:00',
          endTime: '14:00',
          plannedOvertimeMinutes: 0,
        },
      ],
      new Map([['e1', 45 * 60]]),
      new Map([['e1', 'Ana Torres']]),
    );
    // 5*9h + 5h = 50h vs 45h → +5h
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('Ana Torres');
    expect(findings[0].message).toContain('50 h');
    expect(findings[0].message).toContain('45 h');
    expect(findings[0].message).toContain('+5 h');
    expect(findings[0].context?.excessMinutes).toBe(5 * 60);
  });
  it('computes hourly and OT amounts', () => {
    expect(hourlyRateCents('1800000', 180)).toBe(10000);
    expect(overtimeAmountCents('1800000', 180, 60, 1.5)).toBe('15000');
  });
});
