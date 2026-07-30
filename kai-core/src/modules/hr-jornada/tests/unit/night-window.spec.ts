import { classifyShiftSlot } from '../../domain/rules/night-window.util';

describe('classifyShiftSlot', () => {
  const nightStart = '21:00';
  const nightEnd = '07:00';

  it('day shift 09–18 is not night', () => {
    expect(classifyShiftSlot('09:00', '18:00', nightStart, nightEnd)).toEqual({
      isNight: false,
      isNightOutgoing: false,
    });
  });

  it('evening 20–23 overlaps night', () => {
    const r = classifyShiftSlot('20:00', '23:00', nightStart, nightEnd);
    expect(r.isNight).toBe(true);
    expect(r.isNightOutgoing).toBe(false);
  });

  it('overnight 22–06 is night outgoing', () => {
    const r = classifyShiftSlot('22:00', '06:00', nightStart, nightEnd);
    expect(r.isNight).toBe(true);
    expect(r.isNightOutgoing).toBe(true);
  });

  it('early morning 05–08 overlaps night but ends after nightEnd', () => {
    const r = classifyShiftSlot('05:00', '08:00', nightStart, nightEnd);
    expect(r.isNight).toBe(true);
    expect(r.isNightOutgoing).toBe(false);
  });

  it('afternoon ending before night is not night', () => {
    expect(classifyShiftSlot('14:00', '20:00', nightStart, nightEnd)).toEqual({
      isNight: false,
      isNightOutgoing: false,
    });
  });
});
