import {
  formatDiningSequenceLabel,
} from '../../application/dining-business-period.util';

describe('dining sequence labels by kind', () => {
  it('keeps counter and takeaway namespaces independent', () => {
    expect(formatDiningSequenceLabel('COUNTER', 1)).not.toBe(
      formatDiningSequenceLabel('TAKEAWAY', 1),
    );
  });
});
