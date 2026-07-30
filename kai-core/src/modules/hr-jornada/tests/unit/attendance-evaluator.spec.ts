import { ShiftExceptionType } from '../../domain/hr-jornada.enums';
import {
  FlexibleMode,
  ShiftSystemType,
} from '../../domain/shift-system.enums';
import {
  contractWeeklyMinutes,
  effectiveGeneratesLate,
  effectiveOvertimeEnabled,
  evaluateTimeEntry,
  shouldEmitOvertime,
} from '../../domain/rules/attendance-evaluator';

describe('attendance-evaluator (M3)', () => {
  const baseCtx = {
    shiftSystemType: ShiftSystemType.FIXED,
    generatesLateEvents: true,
    overtimeEnabled: true,
    fixedScheduleJson: { '0': { start: '09:00', end: '18:00' } },
  };

  it('FIXED late when after start', () => {
    const findings = evaluateTimeEntry(
      { kind: 'IN', occurredAt: new Date('2026-07-20T09:15:00') },
      baseCtx,
      '2026-07-20',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe(ShiftExceptionType.LATE);
    expect(findings[0]?.minutes).toBe(15);
  });

  it('FLEXIBLE OPEN never late', () => {
    expect(
      effectiveGeneratesLate({
        shiftSystemType: ShiftSystemType.FLEXIBLE,
        flexibleMode: FlexibleMode.OPEN,
        generatesLateEvents: true,
        overtimeEnabled: true,
      }),
    ).toBe(false);
  });

  it('FREE disables late and OT', () => {
    const ctx = {
      shiftSystemType: ShiftSystemType.FREE,
      generatesLateEvents: true,
      overtimeEnabled: true,
    };
    expect(effectiveGeneratesLate(ctx)).toBe(false);
    expect(effectiveOvertimeEnabled(ctx)).toBe(false);
  });

  it('FLEXIBLE BAND late after latestStart', () => {
    const findings = evaluateTimeEntry(
      { kind: 'IN', occurredAt: new Date('2026-07-20T10:30:00') },
      {
        shiftSystemType: ShiftSystemType.FLEXIBLE,
        flexibleMode: FlexibleMode.BAND,
        generatesLateEvents: true,
        overtimeEnabled: true,
        flexibleBandJson: { '0': { latestStart: '10:00' } },
      },
      '2026-07-20',
    );
    expect(findings[0]?.minutes).toBe(30);
  });

  it('shouldEmitOvertime respects extraHoursMode NONE', () => {
    expect(
      shouldEmitOvertime(
        {
          shiftSystemType: ShiftSystemType.ROTATING,
          generatesLateEvents: true,
          overtimeEnabled: true,
        },
        'NONE',
      ),
    ).toBe(false);
  });

  it('contractWeeklyMinutes parses hours', () => {
    expect(contractWeeklyMinutes('45')).toBe(2700);
    expect(contractWeeklyMinutes(null)).toBeNull();
  });
});
