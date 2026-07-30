import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import { EShopCheckoutOrderService } from '../../application/eshop-checkout-order.service';

describe('EShopCheckoutOrderService.resumeOnlinePayment', () => {
  const transactionRepo = { findOne: jest.fn() };
  const companiesService = {
    getMercadoPagoSettingsInternal: jest.fn(),
  };
  const paymentGatewayIntents = {
    findById: jest.fn(),
    findLatestByTransactionId: jest.fn(),
    saveMpPreferenceId: jest.fn(),
  };
  const mpClient = {
    createCheckoutPreference: jest.fn(),
  };

  const service = new EShopCheckoutOrderService(
    {} as never, // userRepo
    {} as never, // customerRepo
    companiesService as never,
    {} as never, // transactionsService
    {} as never, // fulfillmentMethods
    {} as never, // customerUpsert
    {} as never, // backorderRegistration
    paymentGatewayIntents as never,
    mpClient as never,
    transactionRepo as never,
    {} as never, // pricingStock
    {} as never, // cartService
    {} as never, // deliveryZoneRepo
    {} as never, // deliveryOrderService
    {} as never, // resolveDeliveryZone
    {} as never, // deliveryQuote
    {} as never, // deliveryOccurrences
    {} as never, // deliveryCoverage
  );

  const store = { companyId: 'co-1', companyName: 'Joyarte' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    companiesService.getMercadoPagoSettingsInternal.mockResolvedValue({
      enabled: true,
      eshopOnlinePaymentEnabled: true,
      publicKey: 'TEST-pk',
      accessToken: 'TEST-token',
      environment: 'sandbox',
    });
  });

  it('rejects order from another company (not found)', async () => {
    transactionRepo.findOne.mockResolvedValue(null);
    await expect(service.resumeOnlinePayment(store, 'tx-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects already PAID order', async () => {
    transactionRepo.findOne.mockResolvedValue({
      id: 'tx-1',
      companyId: 'co-1',
      paymentStatus: PaymentStatus.PAID,
      documentNumber: 'D1',
      metadata: {
        source: 'e-shop',
        eShopOrder: {
          paymentExpectation: 'ONLINE_REQUIRED',
          paymentGatewayIntentId: 'intent-1',
          customerSnapshot: { email: 'a@t.com', name: 'A' },
        },
      },
    });

    await expect(service.resumeOnlinePayment(store, 'tx-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reuses existing preference for pending online order', async () => {
    transactionRepo.findOne.mockResolvedValue({
      id: 'tx-1',
      companyId: 'co-1',
      paymentStatus: PaymentStatus.PENDING,
      documentNumber: 'D1',
      metadata: {
        source: 'e-shop',
        eShopOrder: {
          paymentExpectation: 'ONLINE_REQUIRED',
          paymentGatewayIntentId: 'intent-1',
          customerSnapshot: { email: 'a@t.com', name: 'A' },
        },
      },
    });
    paymentGatewayIntents.findById.mockResolvedValue({
      id: 'intent-1',
      channel: 'ESHOP_CHECKOUT',
      status: 'CREATED',
      amount: 9000,
      transactionId: 'tx-1',
      externalReference: 'ks:ref',
      metadata: { mpPreferenceId: 'pref-1' },
    });

    const result = await service.resumeOnlinePayment(store, 'tx-1');

    expect(result).toMatchObject({
      orderId: 'tx-1',
      preferenceId: 'pref-1',
      intentId: 'intent-1',
      publicKey: 'TEST-pk',
      payerEmail: 'a@t.com',
      payableTotal: 9000,
    });
    expect(mpClient.createCheckoutPreference).not.toHaveBeenCalled();
  });
});
