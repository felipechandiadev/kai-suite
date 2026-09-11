import { ProductType } from '@modules/products/domain/product.entity';
import { resolvePricingFloorNet } from '@modules/pricing/application/pricing-floor.util';

describe('pricing-floor.util', () => {
  it('uses only PMP for manufactured products', () => {
    expect(
      resolvePricingFloorNet({ pmp: null, baseCost: 500 }, ProductType.MANUFACTURADO),
    ).toBe(0);
    expect(
      resolvePricingFloorNet({ pmp: 120, baseCost: 500 }, ProductType.ELABORADO),
    ).toBe(120);
  });

  it('uses frozen sale cost for physical products', () => {
    expect(
      resolvePricingFloorNet({ pmp: null, baseCost: 80 }, ProductType.PHYSICAL),
    ).toBe(80);
  });
});
