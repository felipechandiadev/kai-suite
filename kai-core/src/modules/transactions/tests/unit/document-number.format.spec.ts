/**
 * Regla de formato de folio correlativo (espejo de DocumentNumberService.allocateNext).
 * Sin guiones; correlativo con mínimo 5 dígitos y crecimiento libre.
 */
function formatBusinessDocumentNumber(
  code: string,
  year: number,
  sequence: number,
): string {
  const yy = String(year).slice(-2);
  return `${code}${yy}${String(sequence).padStart(5, '0')}`;
}

describe('document number format (no hyphens)', () => {
  it('formats CODE + YY + padded sequence', () => {
    expect(formatBusinessDocumentNumber('VTA', 2026, 32)).toBe('VTA2600032');
    expect(formatBusinessDocumentNumber('COT', 2026, 1)).toBe('COT2600001');
    expect(formatBusinessDocumentNumber('OC', 2026, 12)).toBe('OC2600012');
  });

  it('grows past 5 digits when sequence exceeds 99999', () => {
    expect(formatBusinessDocumentNumber('VTA', 2026, 100000)).toBe(
      'VTA26100000',
    );
  });

  it('never includes hyphens', () => {
    const folio = formatBusinessDocumentNumber('ECG', 2026, 12);
    expect(folio).not.toMatch(/-/);
    expect(folio).toBe('ECG2600012');
  });
});
