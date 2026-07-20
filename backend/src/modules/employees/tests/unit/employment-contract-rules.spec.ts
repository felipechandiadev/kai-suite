import { EmploymentContractStatus } from '../../domain/employment-contract.enums';
import { EmployeeShiftStatus } from '../../../hr-jornada/domain/hr-employee-shift.entity';

/**
 * Mirrors terminate-previous ACTIVE before activating another
 * (unique partial index uq_hr_employment_contracts_active).
 */
function applyActivateContract(
  existing: Array<{ id: string; status: EmploymentContractStatus }>,
  activatingId: string,
): Array<{ id: string; status: EmploymentContractStatus }> {
  return existing.map((c) => {
    if (c.id === activatingId) {
      return { ...c, status: EmploymentContractStatus.ACTIVE };
    }
    if (c.status === EmploymentContractStatus.ACTIVE) {
      return { ...c, status: EmploymentContractStatus.TERMINATED };
    }
    return c;
  });
}

describe('unique ACTIVE employment contract', () => {
  it('terminates previous ACTIVE when activating another', () => {
    const rows = applyActivateContract(
      [
        { id: 'a', status: EmploymentContractStatus.ACTIVE },
        { id: 'b', status: EmploymentContractStatus.DRAFT },
      ],
      'b',
    );
    expect(
      rows.filter((r) => r.status === EmploymentContractStatus.ACTIVE),
    ).toHaveLength(1);
    expect(rows.find((r) => r.id === 'a')?.status).toBe(
      EmploymentContractStatus.TERMINATED,
    );
    expect(rows.find((r) => r.id === 'b')?.status).toBe(
      EmploymentContractStatus.ACTIVE,
    );
  });
});

function applyActivateShift(
  existing: Array<{ id: string; status: EmployeeShiftStatus }>,
  activatingId: string,
): Array<{ id: string; status: EmployeeShiftStatus }> {
  return existing.map((s) => {
    if (s.id === activatingId) {
      return { ...s, status: EmployeeShiftStatus.ACTIVE };
    }
    if (s.status === EmployeeShiftStatus.ACTIVE) {
      return { ...s, status: EmployeeShiftStatus.INACTIVE };
    }
    return s;
  });
}

describe('unique ACTIVE employee shift', () => {
  it('deactivates previous ACTIVE when activating another', () => {
    const rows = applyActivateShift(
      [
        { id: 's1', status: EmployeeShiftStatus.ACTIVE },
        { id: 's2', status: EmployeeShiftStatus.INACTIVE },
      ],
      's2',
    );
    expect(
      rows.filter((r) => r.status === EmployeeShiftStatus.ACTIVE),
    ).toHaveLength(1);
    expect(rows.find((r) => r.id === 's1')?.status).toBe(
      EmployeeShiftStatus.INACTIVE,
    );
  });
});

function expandScheduleToWeek(
  weekStart: string,
  scheduleJson: Record<string, { start?: string; end?: string } | null>,
): Array<{ workDate: string; startTime: string; endTime: string }> {
  const addDays = (iso: string, days: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const out: Array<{ workDate: string; startTime: string; endTime: string }> =
    [];
  for (let i = 0; i < 7; i++) {
    const slot = scheduleJson[String(i)];
    if (!slot?.start || !slot?.end) continue;
    out.push({
      workDate: addDays(weekStart, i),
      startTime: slot.start,
      endTime: slot.end,
    });
  }
  return out;
}

describe('employee shift schedule expand', () => {
  it('expands Mon-Fri slots for a week', () => {
    const schedule: Record<string, { start: string; end: string } | null> = {
      '0': { start: '09:00', end: '18:00' },
      '1': { start: '09:00', end: '18:00' },
      '2': { start: '09:00', end: '18:00' },
      '3': { start: '09:00', end: '18:00' },
      '4': { start: '09:00', end: '18:00' },
      '5': null,
      '6': null,
    };
    const rows = expandScheduleToWeek('2026-07-13', schedule);
    expect(rows).toHaveLength(5);
    expect(rows[0].workDate).toBe('2026-07-13');
    expect(rows[4].workDate).toBe('2026-07-17');
  });
});
