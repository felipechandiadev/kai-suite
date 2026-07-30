import { DiningReadyNotificationService } from '../../application/dining-ready-notification.service';

describe('DiningReadyNotificationService summaries', () => {
  const svc = new DiningReadyNotificationService({
    publish: jest.fn(),
  } as any);

  it('groups lines by variant+notes and sums qty', () => {
    const items = svc.buildKitchenItemSummaries([
      {
        id: 'a',
        productVariantId: 'v1',
        quantity: 1,
        notes: 'sin cebolla',
        productVariant: { product: { name: 'Lomo' } } as any,
      },
      {
        id: 'b',
        productVariantId: 'v1',
        quantity: 1,
        notes: 'sin cebolla',
        productVariant: { product: { name: 'Lomo' } } as any,
      },
      {
        id: 'c',
        productVariantId: 'v2',
        quantity: 2,
        notes: null,
        productVariant: { product: { name: 'Coca' } } as any,
      },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: 'Lomo',
      quantity: 2,
      notes: 'sin cebolla',
      lineIds: ['a', 'b'],
    });
    expect(items[1]).toMatchObject({ name: 'Coca', quantity: 2, notes: null });
  });

  it('formats item and order bodies', () => {
    const items = [
      {
        lineIds: ['a'],
        productVariantId: 'v1',
        name: 'Lomo',
        quantity: 2,
        notes: 'sin cebolla',
      },
      {
        lineIds: ['c'],
        productVariantId: 'v2',
        name: 'Coca',
        quantity: 1,
        notes: null,
      },
    ];
    expect(svc.formatItemReadyBody(items)).toBe(
      '2× Lomo · sin cebolla · 1× Coca',
    );
    expect(svc.formatOrderReadyBody(items)).toBe(
      '• 2× Lomo · sin cebolla\n• 1× Coca',
    );
  });
});
