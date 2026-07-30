import { PaymentStatus, TransactionStatus } from '@modules/transactions/domain/transaction.entity';
import { MercadoPagoEshopOrderSyncService } from '../application/mercado-pago-eshop-order-sync.service';

describe('MercadoPagoEshopOrderSyncService', () => {
  const transactionRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const cartRepo = {
    update: jest.fn(),
  };
  const cartItemRepo = {
    delete: jest.fn(),
  };
  const companiesService = {
    getCompanyById: jest.fn(),
  };
  const deliveryOrders = {
    confirmAfterOnlinePayment: jest.fn(),
  };
  const orderNotifications = {
    publishOrderCreated: jest.fn(),
  };
  const kaiMail = {
    sendOrderTemplate: jest.fn(),
  };

  const service = new MercadoPagoEshopOrderSyncService(
    transactionRepo as never,
    cartRepo as never,
    cartItemRepo as never,
    companiesService as never,
    deliveryOrders as never,
    orderNotifications as never,
    kaiMail as never,
  );

  const intent = {
    id: 'intent-1',
    companyId: 'co-1',
    channel: 'ESHOP_CHECKOUT' as const,
    status: 'APPROVED' as const,
    amount: 15000,
    transactionId: 'tx-1',
  };

  const baseTx = {
    id: 'tx-1',
    companyId: 'co-1',
    paymentStatus: PaymentStatus.PENDING,
    status: TransactionStatus.PENDING,
    documentNumber: 'DOC-1',
    total: 15000,
    metadata: {
      source: 'e-shop',
      cartId: 'cart-1',
      eShopOrder: {
        paymentExpectation: 'ONLINE_REQUIRED',
        fulfillmentStatus: 'SUBMITTED',
        statusHistory: [{ status: 'SUBMITTED', at: '2026-01-01T00:00:00.000Z' }],
        customerSnapshot: {
          name: 'Ana',
          email: 'ana@test.com',
        },
        fulfillmentMethodSnapshot: { name: 'Retiro' },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionRepo.findOne.mockResolvedValue({
      ...baseTx,
      metadata: {
        ...baseTx.metadata,
        eShopOrder: { ...baseTx.metadata.eShopOrder },
      },
    });
    transactionRepo.save.mockImplementation(async (tx) => tx);
    companiesService.getCompanyById.mockResolvedValue({
      nombreFantasia: 'Joyarte',
      razonSocial: 'Joyarte SpA',
    });
  });

  it('marks PAID/CONFIRMED, confirms delivery, notify and mail on first approve', async () => {
    await service.syncOnApprovedPayment(intent as never);

    expect(transactionRepo.save).toHaveBeenCalled();
    const saved = transactionRepo.save.mock.calls[0][0];
    expect(saved.paymentStatus).toBe(PaymentStatus.PAID);
    expect(saved.status).toBe(TransactionStatus.CONFIRMED);
    expect(saved.metadata.eShopOrder.fulfillmentStatus).toBe('CONFIRMED');
    expect(saved.metadata.eShopOrder.statusHistory.at(-1).status).toBe('CONFIRMED');
    expect(deliveryOrders.confirmAfterOnlinePayment).toHaveBeenCalledWith('co-1', 'tx-1');
    expect(orderNotifications.publishOrderCreated).toHaveBeenCalledWith('co-1', saved);
    expect(kaiMail.sendOrderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'order.received',
        to: 'ana@test.com',
        idempotencyKey: 'order:tx-1:received',
      }),
    );
    expect(cartItemRepo.delete).toHaveBeenCalledWith({ cartId: 'cart-1' });
  });

  it('is idempotent: no mail/notify when already PAID', async () => {
    transactionRepo.findOne.mockResolvedValue({
      ...baseTx,
      paymentStatus: PaymentStatus.PAID,
    });

    await service.syncOnApprovedPayment(intent as never);

    expect(transactionRepo.save).not.toHaveBeenCalled();
    expect(deliveryOrders.confirmAfterOnlinePayment).not.toHaveBeenCalled();
    expect(orderNotifications.publishOrderCreated).not.toHaveBeenCalled();
    expect(kaiMail.sendOrderTemplate).not.toHaveBeenCalled();
  });
});
