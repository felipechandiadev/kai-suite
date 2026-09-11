import { ProductType } from '@modules/products/domain/product.entity';
import {
  computePackPmpSum,
  computePackProducibleQty,
  expandPackComponentNeeds,
  mergeVariantQtyMaps,
} from '../../application/pack-ctp.util';

describe('pack-ctp.util', () => {
  it('computePackProducibleQty returns bottleneck from components', () => {
    const cap = computePackProducibleQty(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 2,
          inputProductType: ProductType.PHYSICAL,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 3,
          inputProductType: ProductType.PHYSICAL,
        },
      ],
      { a: 10, b: 7 },
    );
    expect(cap).toBe(2);
  });

  it('computePackPmpSum sums component costs', () => {
    const pmp = computePackPmpSum(
      [
        { inputVariantId: 'a', qtyPerOutputUnit: 2 },
        { inputVariantId: 'b', qtyPerOutputUnit: 1 },
      ],
      { a: 100, b: 50 },
    );
    expect(pmp).toBe(250);
  });

  it('expandPackComponentNeeds scales by pack line qty', () => {
    const needs = expandPackComponentNeeds('pack-1', 3, [
      { inputVariantId: 'a', qtyPerOutputUnit: 2 },
      { inputVariantId: 'b', qtyPerOutputUnit: 1 },
    ]);
    expect(needs.get('a')).toBe(6);
    expect(needs.get('b')).toBe(3);
  });

  it('mergeVariantQtyMaps accumulates quantities', () => {
    const target = new Map<string, number>([['a', 1]]);
    mergeVariantQtyMaps(target, new Map([['a', 2], ['b', 4]]));
    expect(target.get('a')).toBe(3);
    expect(target.get('b')).toBe(4);
  });
});
