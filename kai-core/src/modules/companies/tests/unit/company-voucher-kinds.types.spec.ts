import { sanitizeVoucherKindInput } from '../../domain/company-voucher-kinds.types';

describe('company-voucher-kinds.types', () => {
  it('sanitizes FIXED requiring defaultFaceValue', () => {
    expect(() =>
      sanitizeVoucherKindInput({
        name: 'Gas',
        faceValueMode: 'FIXED',
        defaultFaceValue: 0,
      }),
    ).toThrow(/FIXED/);
    const ok = sanitizeVoucherKindInput({
      name: 'Gas',
      faceValueMode: 'FIXED',
      defaultFaceValue: 10000,
      isActive: true,
    });
    expect(ok?.faceValueMode).toBe('FIXED');
    expect(ok?.defaultFaceValue).toBe(10000);
  });

  it('defaults OPEN mode with required face value', () => {
    const ok = sanitizeVoucherKindInput({ name: 'Meal', requireFaceValue: false });
    expect(ok?.faceValueMode).toBe('OPEN');
    expect(ok?.requireFaceValue).toBe(true);
  });
});
