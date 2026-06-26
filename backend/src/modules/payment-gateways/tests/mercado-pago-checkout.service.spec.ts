import { BadRequestException } from '@nestjs/common';
import { MercadoPagoCheckoutService } from '../application/mercado-pago-checkout.service';

describe('MercadoPagoCheckoutService', () => {
  const companiesService = {
    getMercadoPagoSettingsInternal: jest.fn(),
  };
  const mpClient = {
    createOrder: jest.fn(),
  };
  const intentService = {
    findById: jest.fn(),
    applyMpOrder: jest.fn(),
    toPublicDto: jest.fn((intent) => ({
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
    })),
  };
  const eshopSync = {
    syncOnApprovedPayment: jest.fn(),
  };

  const service = new MercadoPagoCheckoutService(
    companiesService as never,
    mpClient as never,
    intentService as never,
    eshopSync as never,
  );

  const baseIntent = {
    id: 'intent-1',
    companyId: 'co-1',
    channel: 'ESHOP_CHECKOUT',
    status: 'CREATED',
    amount: 10000,
    externalReference: 'ks:co-1:eshop:intent-1',
    idempotencyKey: 'ks-intent-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    companiesService.getMercadoPagoSettingsInternal.mockResolvedValue({
      accessToken: 'TEST-token',
      environment: 'sandbox',
      publicKey: 'TEST-pk',
      eshopOnlinePaymentEnabled: true,
    });
    intentService.findById.mockResolvedValue({ ...baseIntent });
  });

  it('returns awaitingWallet for wallet_purchase without creating order', async () => {
    const result = await service.confirmPayment({
      companyId: 'co-1',
      intentId: 'intent-1',
      payerEmail: 'buyer@test.com',
      selectedPaymentMethod: 'wallet_purchase',
    });

    expect(mpClient.createOrder).not.toHaveBeenCalled();
    expect(result.awaitingWallet).toBe(true);
    expect(result.status).toBe('CREATED');
  });

  it('creates API order for card payments', async () => {
    intentService.applyMpOrder.mockResolvedValue({
      ...baseIntent,
      status: 'APPROVED',
    });

    mpClient.createOrder.mockResolvedValue({
      id: 'ORD01',
      status: 'processed',
      transactions: { payments: [{ status: 'processed', status_detail: 'accredited' }] },
    });

    const result = await service.confirmPayment({
      companyId: 'co-1',
      intentId: 'intent-1',
      payerEmail: 'buyer@test.com',
      token: 'card-token',
      paymentMethodId: 'visa',
      selectedPaymentMethod: 'credit_card',
      installments: 1,
    });

    expect(mpClient.createOrder).toHaveBeenCalled();
    expect(eshopSync.syncOnApprovedPayment).toHaveBeenCalled();
    expect(result.awaitingWallet).toBe(false);
    expect(result.status).toBe('APPROVED');
  });

  it('requires token for card flow', async () => {
    await expect(
      service.confirmPayment({
        companyId: 'co-1',
        intentId: 'intent-1',
        payerEmail: 'buyer@test.com',
        selectedPaymentMethod: 'credit_card',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
