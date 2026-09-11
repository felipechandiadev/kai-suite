import {
  resolveFrozenSaleUnitCost,
  resolveSaleLineUnitCost,
} from '@modules/product-variants/application/helpers/sale-unit-cost.util';

describe('sale-unit-cost.util', () => {
  it('prefers explicit line unitCost', () => {
    expect(resolveSaleLineUnitCost(500, { pmp: 100, baseCost: 50 })).toBe(500);
  });

  it('uses pmp when line cost missing', () => {
    expect(resolveSaleLineUnitCost(0, { pmp: 853.33, baseCost: 50 })).toBe(853.33);
  });

  it('falls back to baseCost when pmp absent', () => {
    expect(resolveFrozenSaleUnitCost({ pmp: null, baseCost: 120 })).toBe(120);
  });

  it('returns 0 when no cost data', () => {
    expect(resolveFrozenSaleUnitCost({ pmp: null, baseCost: null })).toBe(0);
  });
});
