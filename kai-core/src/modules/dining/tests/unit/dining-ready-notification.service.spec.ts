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

  it('includes USER_IDS audience when sentByUserId is set', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const withPub = new DiningReadyNotificationService({
      publish,
    } as any);
    await withPub.publishOrderReady({
      companyId: 'c1',
      order: {
        id: 'o1',
        displayLabel: 'Mesa 1',
        diningTableId: 't1',
        branchId: 'b1',
        openedByUserId: 'opener-1',
      } as any,
      productionUnitId: 'u1',
      fireId: 'f1',
      fireNumber: 3,
      items: [
        {
          lineIds: ['a'],
          productVariantId: 'v1',
          name: 'Lomo',
          quantity: 1,
          notes: null,
        },
      ],
      sentByUserId: 'waiter-user-1',
    });
    expect(publish).toHaveBeenCalledTimes(1);
    const cmd = publish.mock.calls[0][0];
    expect(cmd.audiences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audienceType: 'ROLES',
          audienceConfig: expect.objectContaining({
            roles: expect.arrayContaining([
              'ADMIN',
              'POS_OPERATOR',
              'WAITER',
            ]),
          }),
        }),
        expect.objectContaining({
          audienceType: 'USER_IDS',
          audienceConfig: {
            userIds: expect.arrayContaining(['waiter-user-1', 'opener-1']),
          },
        }),
      ]),
    );
    const userAudience = cmd.audiences.find(
      (a: { audienceType: string }) => a.audienceType === 'USER_IDS',
    );
    expect(userAudience.audienceConfig.userIds).toHaveLength(2);
  });

  it('includes openedByUserId even when sentByUserId is missing', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const withPub = new DiningReadyNotificationService({
      publish,
    } as any);
    await withPub.publishItemReady({
      companyId: 'c1',
      order: {
        id: 'o1',
        displayLabel: 'Mesa 2',
        diningTableId: 't2',
        branchId: 'b1',
        openedByUserId: 'opener-only',
      } as any,
      productionUnitId: 'u1',
      fireId: 'f2',
      items: [
        {
          lineIds: ['a'],
          productVariantId: 'v1',
          name: 'Lomo',
          quantity: 1,
          notes: null,
        },
      ],
      sentByUserId: null,
    });
    const cmd = publish.mock.calls[0][0];
    expect(cmd.audiences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audienceType: 'USER_IDS',
          audienceConfig: { userIds: ['opener-only'] },
        }),
      ]),
    );
  });
});
