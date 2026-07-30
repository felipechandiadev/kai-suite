import { BadRequestException } from '@nestjs/common';
import {
  evaluateStockPolicy,
  isEshopCheckoutCommercialBackorder,
  shouldCreateBackorder,
} from '../../application/helpers/eshop-stock-policy.util';

describe('eshop-stock-policy.util', () => {
  const line = {
    variantId: 'v1',
    requestedQty: 5,
    availableQty: 2,
    trackInventory: true,
  };

  it('IGNORE_STOCK does not throw', () => {
    const r = evaluateStockPolicy('IGNORE_STOCK', [line]);
    expect(r.hasShortage).toBe(true);
  });

  it('BLOCK_OUT_OF_STOCK throws', () => {
    expect(() => evaluateStockPolicy('BLOCK_OUT_OF_STOCK', [line])).toThrow(
      BadRequestException,
    );
  });

  it('ALLOW_BACKORDER reports shortage without throw', () => {
    const r = evaluateStockPolicy('ALLOW_BACKORDER', [line]);
    expect(r.hasShortage).toBe(true);
    expect(shouldCreateBackorder('ALLOW_BACKORDER', r.hasShortage)).toBe(true);
  });

  it('shouldCreateBackorder false when no shortage', () => {
    expect(shouldCreateBackorder('ALLOW_BACKORDER', false)).toBe(false);
  });

  it('isEshopCheckoutCommercialBackorder is always true (encargo sin abono)', () => {
    expect(isEshopCheckoutCommercialBackorder()).toBe(true);
  });
});
