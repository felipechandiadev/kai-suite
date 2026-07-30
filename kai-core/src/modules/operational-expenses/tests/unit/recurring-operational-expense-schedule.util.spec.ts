import {
  computeNextRunAt,
  isoWeekPeriodKey,
  periodKeyFor,
  validateRecurrenceSchedule,
} from '../../application/recurring-operational-expense-schedule.util';
import { RecurringOperationalExpenseFrequency } from '../../domain/recurring-operational-expense.entity';

describe('recurring-operational-expense-schedule.util', () => {
  describe('periodKeyFor', () => {
    it('formats monthly and yearly', () => {
      const d = new Date(Date.UTC(2026, 6, 20)); // Jul 20
      expect(periodKeyFor(d, RecurringOperationalExpenseFrequency.MONTHLY)).toBe(
        '2026-07',
      );
      expect(periodKeyFor(d, RecurringOperationalExpenseFrequency.YEARLY)).toBe(
        '2026',
      );
    });

    it('formats weekly ISO week', () => {
      const d = new Date(Date.UTC(2026, 6, 20));
      expect(periodKeyFor(d, RecurringOperationalExpenseFrequency.WEEKLY)).toBe(
        isoWeekPeriodKey(d),
      );
      expect(isoWeekPeriodKey(d)).toMatch(/^2026-W\d{2}$/);
    });
  });

  describe('validateRecurrenceSchedule', () => {
    it('requires dayOfWeek for WEEKLY', () => {
      expect(
        validateRecurrenceSchedule({
          frequency: RecurringOperationalExpenseFrequency.WEEKLY,
          dayOfWeek: null,
        }),
      ).toMatch(/dayOfWeek/);
    });

    it('requires dayOfMonth for MONTHLY', () => {
      expect(
        validateRecurrenceSchedule({
          frequency: RecurringOperationalExpenseFrequency.MONTHLY,
          dayOfMonth: null,
        }),
      ).toMatch(/dayOfMonth/);
    });
  });

  describe('computeNextRunAt', () => {
    it('MONTHLY advances to next month when day already passed', () => {
      const from = new Date(Date.UTC(2026, 6, 20)); // Jul 20
      const next = computeNextRunAt(from, {
        frequency: RecurringOperationalExpenseFrequency.MONTHLY,
        dayOfMonth: 15,
      });
      expect(next.toISOString()).toBe(
        new Date(Date.UTC(2026, 7, 15)).toISOString(),
      );
    });

    it('MONTHLY uses same month when day is ahead', () => {
      const from = new Date(Date.UTC(2026, 6, 10));
      const next = computeNextRunAt(from, {
        frequency: RecurringOperationalExpenseFrequency.MONTHLY,
        dayOfMonth: 15,
      });
      expect(next.toISOString()).toBe(
        new Date(Date.UTC(2026, 6, 15)).toISOString(),
      );
    });

    it('WEEKLY picks next matching weekday', () => {
      // 2026-07-20 is Monday (1)
      const from = new Date(Date.UTC(2026, 6, 20));
      const next = computeNextRunAt(from, {
        frequency: RecurringOperationalExpenseFrequency.WEEKLY,
        dayOfWeek: 3, // Wednesday
      });
      expect(next.getUTCDay()).toBe(3);
      expect(next.getUTCDate()).toBe(22);
    });
  });
});
