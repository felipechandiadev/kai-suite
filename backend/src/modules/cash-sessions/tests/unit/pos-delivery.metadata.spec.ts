import { parsePosDeliveryMetadata } from '../../application/pos-delivery.metadata';

describe('parsePosDeliveryMetadata', () => {
  it('returns null when missing or invalid', () => {
    expect(parsePosDeliveryMetadata(null)).toBeNull();
    expect(parsePosDeliveryMetadata({})).toBeNull();
    expect(
      parsePosDeliveryMetadata({
        posDelivery: { deliveryZoneId: 'z1', shippingFee: 100 },
      }),
    ).toBeNull();
  });

  it('parses a valid posDelivery snapshot', () => {
    const parsed = parsePosDeliveryMetadata({
      posDelivery: {
        deliveryZoneId: 'z1',
        deliveryOccurrenceId: 'o1',
        address: 'Calle 1',
        communeCode: '07101',
        latitude: -35.4,
        longitude: -71.6,
        shippingFee: 1500,
        zoneName: 'Norte',
        notes: 'nota',
      },
    });
    expect(parsed).toMatchObject({
      deliveryZoneId: 'z1',
      deliveryOccurrenceId: 'o1',
      shippingFee: 1500,
      zoneName: 'Norte',
      notes: 'nota',
    });
  });
});
