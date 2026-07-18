import {
  diningBusinessPeriodKey,
  formatDiningSequenceLabel,
  normalizeDiningResetTime,
} from '../../application/dining-business-period.util';

describe('diningBusinessPeriodKey', () => {
  const tz = 'America/Santiago';
  const reset = '00:00:01';

  it('keeps previous calendar day before reset', () => {
    // 2026-07-17 00:00:00 America/Santiago = 2026-07-17 04:00:00 UTC (standard approx; use explicit offset via moment)
    const before = new Date('2026-07-17T04:00:00.000Z'); // 00:00:00 Santiago (UTC-4 winter)
    expect(diningBusinessPeriodKey(before, tz, reset)).toBe('2026-07-16');
  });

  it('starts new period at reset time', () => {
    const atReset = new Date('2026-07-17T04:00:01.000Z'); // 00:00:01 Santiago
    expect(diningBusinessPeriodKey(atReset, tz, reset)).toBe('2026-07-17');
  });

  it('uses calendar day after reset', () => {
    const afternoon = new Date('2026-07-17T18:00:00.000Z'); // 14:00 Santiago
    expect(diningBusinessPeriodKey(afternoon, tz, reset)).toBe('2026-07-17');
  });
});

describe('formatDiningSequenceLabel', () => {
  it('formats counter and takeaway', () => {
    expect(formatDiningSequenceLabel('COUNTER', 1)).toBe('Cuenta barra #1');
    expect(formatDiningSequenceLabel('TAKEAWAY', 12)).toBe('Para llevar #12');
  });
});

describe('normalizeDiningResetTime', () => {
  it('defaults and validates', () => {
    expect(normalizeDiningResetTime(undefined)).toBe('00:00:01');
    expect(() => normalizeDiningResetTime('25:00:00')).toThrow();
  });
});
