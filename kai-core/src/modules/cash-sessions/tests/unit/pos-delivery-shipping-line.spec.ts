import {
  buildPosDeliveryShippingLine,
  POS_DELIVERY_SHIPPING_LINE_NOTES,
} from '../../application/pos-delivery-shipping-line';

describe('buildPosDeliveryShippingLine', () => {
  it('builds a non-inventory fee line that balances product total + fee', () => {
    const productTotal = 5938;
    const shippingFee = 2500;
    const line = buildPosDeliveryShippingLine({
      shippingFee,
      zoneName: 'Parral',
    });

    expect(line).toEqual({
      productName: 'Reparto · Parral',
      quantity: 1,
      unitPrice: 2500,
      unitCost: 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: 2500,
      total: 2500,
      notes: POS_DELIVERY_SHIPPING_LINE_NOTES,
    });
    expect((line as { productVariantId?: string }).productVariantId).toBeUndefined();
    expect(productTotal + line.total).toBe(8438);
  });

  it('falls back to Reparto local without zone name', () => {
    const line = buildPosDeliveryShippingLine({ shippingFee: 1000 });
    expect(line.productName).toBe('Reparto local');
    expect(line.total).toBe(1000);
  });

  it('rounds fee and clamps negative to zero', () => {
    expect(buildPosDeliveryShippingLine({ shippingFee: 1500.6 }).total).toBe(1501);
    expect(buildPosDeliveryShippingLine({ shippingFee: -10 }).total).toBe(0);
  });
});
