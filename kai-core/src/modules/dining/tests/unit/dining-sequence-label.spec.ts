import {
  formatDiningSequenceLabel,
  formatKitchenFireLabel,
} from '../../application/dining-business-period.util';

describe('dining sequence labels by kind', () => {
  it('keeps counter and takeaway namespaces independent', () => {
    expect(formatDiningSequenceLabel('COUNTER', 1)).not.toBe(
      formatDiningSequenceLabel('TAKEAWAY', 1),
    );
  });

  it('formats kitchen fire pedido label', () => {
    expect(formatKitchenFireLabel(1)).toBe('Pedido #1');
    expect(formatKitchenFireLabel(12)).toBe('Pedido #12');
  });
});
