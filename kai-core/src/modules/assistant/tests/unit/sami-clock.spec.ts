import { buildSamiClockPrompt, samiCivilDate } from '../../application/prompts/sami-clock';

describe('sami-clock', () => {
  it('uses America/Santiago civil date', () => {
    // 18 ago 2026 12:00 Chile (UTC-4 en invierno)
    const now = new Date('2026-08-18T16:00:00.000Z');
    expect(samiCivilDate(now)).toBe('2026-08-18');
    const prompt = buildSamiClockPrompt(now);
    expect(prompt).toContain('2026-08-18');
    expect(prompt).toContain('2026-08-01 … 2026-08-18');
    expect(prompt).toContain('2026-08-17 … 2026-08-18');
    expect(prompt).toContain('2026');
    expect(prompt).not.toContain('2023');
  });
});
