import {
  formatCashHubCode,
  nextCashHubCodeFromExisting,
  parseCashHubCodeSequence,
} from '../../application/cash-hub-code.util';

describe('cash-hub-code.util', () => {
  it('parseCashHubCodeSequence accepts CEV#####', () => {
    expect(parseCashHubCodeSequence('CEV00001')).toBe(1);
    expect(parseCashHubCodeSequence('CEV-00001')).toBeNull();
  });

  it('nextCashHubCodeFromExisting picks max+1', () => {
    expect(nextCashHubCodeFromExisting(['CENTRAL', 'CEV00002', 'CEV00001'])).toBe(
      'CEV00003',
    );
    expect(nextCashHubCodeFromExisting([])).toBe('CEV00001');
  });

  it('formatCashHubCode pads to 5 and grows past 99999', () => {
    expect(formatCashHubCode(2)).toBe('CEV00002');
    expect(formatCashHubCode(100000)).toBe('CEV100000');
  });
});
