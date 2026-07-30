import { EShopOrderNotificationService } from '../../application/eshop-order-notification.service';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { EShopNotificationKind } from '@modules/notifications/domain/notification.enums';

describe('EShopOrderNotificationService', () => {
  it('publishOrderCreated calls publisher', async () => {
    const publish = jest.fn().mockResolvedValue([]);
    const svc = new EShopOrderNotificationService({ publish } as never);
    await svc.publishOrderCreated('c1', {
      id: 'tx1',
      documentNumber: 'PED-1',
      total: 1000,
      transactionType: TransactionType.CUSTOMER_ORDER,
      metadata: {
        source: 'e-shop',
        eShopOrder: {
          fulfillmentStatus: 'SUBMITTED',
          customerSnapshot: { name: 'Ana', email: 'a@test.com' },
        },
      },
    } as never);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: EShopNotificationKind.ORDER_CREATED,
        companyId: 'c1',
        entityId: 'tx1',
      }),
    );
  });
});
