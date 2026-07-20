import { RecurringOperationalExpenseFrequency } from '../domain/recurring-operational-expense.entity';

export type RecurrenceScheduleInput = {
  frequency: RecurringOperationalExpenseFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO week key: YYYY-Www */
export function isoWeekPeriodKey(date: Date): string {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function periodKeyFor(
  date: Date,
  frequency: RecurringOperationalExpenseFrequency,
): string {
  if (frequency === RecurringOperationalExpenseFrequency.WEEKLY) {
    return isoWeekPeriodKey(date);
  }
  if (frequency === RecurringOperationalExpenseFrequency.MONTHLY) {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
  }
  return `${date.getUTCFullYear()}`;
}

function assertSchedule(input: RecurrenceScheduleInput): void {
  if (input.frequency === RecurringOperationalExpenseFrequency.WEEKLY) {
    const d = input.dayOfWeek;
    if (d == null || d < 0 || d > 6) {
      throw new Error('dayOfWeek must be 0–6 for WEEKLY frequency');
    }
  } else {
    const d = input.dayOfMonth;
    if (d == null || d < 1 || d > 28) {
      throw new Error('dayOfMonth must be 1–28 for MONTHLY/YEARLY frequency');
    }
  }
}

/**
 * Next run at 00:00 UTC on the scheduled day, strictly after `from` (or equal if `allowSameDay`).
 */
export function computeNextRunAt(
  from: Date,
  input: RecurrenceScheduleInput,
  options?: { allowSameDay?: boolean },
): Date {
  assertSchedule(input);
  const allowSameDay = options?.allowSameDay ?? false;
  const fromDay = startOfUtcDay(from);

  if (input.frequency === RecurringOperationalExpenseFrequency.WEEKLY) {
    const targetDow = input.dayOfWeek!;
    for (let i = allowSameDay ? 0 : 1; i <= 8; i++) {
      const candidate = new Date(fromDay);
      candidate.setUTCDate(candidate.getUTCDate() + i);
      if (candidate.getUTCDay() === targetDow) {
        if (allowSameDay && i === 0) return candidate;
        if (!allowSameDay || i > 0) return candidate;
      }
    }
  }

  if (input.frequency === RecurringOperationalExpenseFrequency.MONTHLY) {
    const dom = input.dayOfMonth!;
    const y = fromDay.getUTCFullYear();
    const m = fromDay.getUTCMonth();
    const thisMonth = new Date(Date.UTC(y, m, dom));
    if (allowSameDay ? thisMonth >= fromDay : thisMonth > fromDay) {
      return thisMonth;
    }
    return new Date(Date.UTC(y, m + 1, dom));
  }

  // YEARLY — same calendar month as `from`, dayOfMonth
  const dom = input.dayOfMonth!;
  const y = fromDay.getUTCFullYear();
  const month = fromDay.getUTCMonth();
  const thisYear = new Date(Date.UTC(y, month, dom));
  if (allowSameDay ? thisYear >= fromDay : thisYear > fromDay) {
    return thisYear;
  }
  return new Date(Date.UTC(y + 1, month, dom));
}

export function validateRecurrenceSchedule(input: RecurrenceScheduleInput): string | null {
  try {
    assertSchedule(input);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid schedule';
  }
}
