import { resolveLineBoletaExempt } from '../../domain/resolve-line-boleta-exempt';

describe('resolveLineBoletaExempt', () => {
  it('uses taxCategory when present', () => {
    expect(
      resolveLineBoletaExempt({
        taxCategory: 'TAX_EXEMPT',
        taxRate: 19,
        taxAmount: 100,
      }),
    ).toBe(true);
    expect(
      resolveLineBoletaExempt({
        taxCategory: 'TAX_STANDARD',
        taxRate: 0,
        taxAmount: 0,
      }),
    ).toBe(false);
  });

  it('falls back to zero tax heuristic', () => {
    expect(resolveLineBoletaExempt({ taxRate: 0, taxAmount: 0 })).toBe(true);
    expect(resolveLineBoletaExempt({ taxRate: 19, taxAmount: 190 })).toBe(false);
  });
});
