import {
  FlexibleMode,
  ShiftSystemType,
} from '@modules/hr-jornada/domain/shift-system.enums';
import { assertShiftSystemContractRules } from '../../application/shift-system-contract.rules';

describe('shift system contract rules (M3)', () => {
  it('requires fixed schedule for FIXED', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.FIXED,
        weeklyHours: 45,
      }),
    ).toMatch(/Horario fijo/);
  });

  it('accepts FIXED with schedule', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.FIXED,
        weeklyHours: 45,
        fixedScheduleJson: { '0': { start: '09:00', end: '18:00' } },
      }),
    ).toBeNull();
  });

  it('requires flexibleMode BAND + band json', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.FLEXIBLE,
        weeklyHours: 44,
        flexibleMode: FlexibleMode.BAND,
      }),
    ).toMatch(/banda/);
  });

  it('accepts FLEXIBLE OPEN without band', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.FLEXIBLE,
        weeklyHours: 44,
        flexibleMode: FlexibleMode.OPEN,
      }),
    ).toBeNull();
  });

  it('requires art22 for FREE', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.FREE,
      }),
    ).toMatch(/Art\. 22/);
  });

  it('requires resolution for EXCEPTIONAL', () => {
    expect(
      assertShiftSystemContractRules({
        shiftSystemType: ShiftSystemType.EXCEPTIONAL,
        weeklyHours: 45,
      }),
    ).toMatch(/resolución/);
  });
});
