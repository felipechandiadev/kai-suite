import {
  monthBoundsFromYmd,
  parseYmdParts,
} from '../../application/accounting-period-month.util';

describe('accounting-period-month.util', () => {
  describe('parseYmdParts', () => {
    it('parses valid YYYY-MM-DD', () => {
      expect(parseYmdParts('2026-06-29')).toEqual({ year: 2026, month: 6, day: 29 });
    });

    it('rejects invalid format', () => {
      expect(() => parseYmdParts('06/29/2026')).toThrow('Invalid date format');
    });
  });

  describe('monthBoundsFromYmd', () => {
    it('returns calendar month bounds without timezone shift', () => {
      expect(monthBoundsFromYmd('2026-06-29')).toEqual({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        year: 2026,
        month: 6,
      });
    });

    it('handles February in leap year', () => {
      expect(monthBoundsFromYmd('2024-02-15')).toEqual({
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        year: 2024,
        month: 2,
      });
    });
  });
});
