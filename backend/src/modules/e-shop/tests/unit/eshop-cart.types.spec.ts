import { evaluateStockPolicy } from '../../application/helpers/eshop-stock-policy.util';
import type { CartIssueCode } from '../../application/types/eshop-cart.types';

describe('eshop-stock-policy.util', () => {
  it('allows backorder shortages', () => {
    const result = evaluateStockPolicy('ALLOW_BACKORDER', [
      {
        variantId: 'v1',
        requestedQty: 5,
        availableQty: 2,
        trackInventory: true,
      },
    ]);
    expect(result.hasShortage).toBe(true);
    expect(result.shortages).toHaveLength(1);
  });

  it('blocks out of stock', () => {
    expect(() =>
      evaluateStockPolicy('BLOCK_OUT_OF_STOCK', [
        {
          variantId: 'v1',
          requestedQty: 5,
          availableQty: 2,
          trackInventory: true,
        },
      ]),
    ).toThrow();
  });
});

describe('eshop-cart issue codes', () => {
  const codes: CartIssueCode[] = [
    'PRICE_CHANGED',
    'OUT_OF_STOCK',
    'INSUFFICIENT_STOCK',
    'VARIANT_UNAVAILABLE',
    'QTY_ADJUSTED',
    'PRODUCT_HIDDEN',
  ];

  it('defines stable issue codes', () => {
    expect(codes).toHaveLength(6);
  });
});
