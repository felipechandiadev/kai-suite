import {
  computeLegacyDriftGross,
  computeSeedPrices,
  isClosedRetailPrice,
  normalizeClosedRetailPrice,
} from '../../../../../../seeds/san-sebastian/san-sebastian-price.util';

describe('san-sebastian-price.util', () => {
  it('preserves closed gross with IVA (no round-trip drift)', () => {
    for (const saleGross of [1500, 2000, 1990, 2990, 7500]) {
      const { grossPrice } = computeSeedPrices(saleGross, true);
      expect(grossPrice).toBe(saleGross);
    }
  });

  it('legacy round-trip drifted common shelf prices', () => {
    expect(computeLegacyDriftGross(1500, true)).toBe(1501);
    expect(computeLegacyDriftGross(7500, true)).toBe(7501);
    expect(computeLegacyDriftGross(1990, true)).toBe(1990);
  });

  it('without IVA net equals gross', () => {
    const { grossPrice, netPrice } = computeSeedPrices(500, false);
    expect(grossPrice).toBe(500);
    expect(netPrice).toBe(500);
  });

  it('normalizes non-closed outliers', () => {
    expect(normalizeClosedRetailPrice(999)).toBe(1000);
    expect(normalizeClosedRetailPrice(1109)).toBe(1110);
  });

  it('isClosedRetailPrice', () => {
    expect(isClosedRetailPrice(2000)).toBe(true);
    expect(isClosedRetailPrice(2990)).toBe(true);
    expect(isClosedRetailPrice(1999)).toBe(false);
  });
});
