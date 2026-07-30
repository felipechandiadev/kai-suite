import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';

describe('SalesFromSessionService — deferPayment', () => {
  function buildService(overrides?: {
    pos?: { id: string; companyId: string; settings: unknown } | null;
    companyDeferredEnabled?: boolean;
  }) {
    const registerPosCommercial = jest.fn().mockResolvedValue({ success: true });
    const pointOfSaleRepository = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.pos === null
          ? null
          : (overrides?.pos ?? {
              id: 'pos-1',
              companyId: 'company-1',
              settings: { kind: 'SALE', allowsDeferredPayment: true },
            }),
      ),
    };
    const companiesService = {
      getDeferredPaymentSettings: jest.fn().mockResolvedValue({
        enabled: overrides?.companyDeferredEnabled ?? true,
      }),
    };
    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, {
      registerPosCommercial,
      pointOfSaleRepository,
      companiesService,
      validateSaleDocumentKindForCreate: jest.fn().mockResolvedValue(undefined),
      maybeEmitSaleBoleta: jest.fn().mockResolvedValue(null),
    });
    return { service, registerPosCommercial, pointOfSaleRepository, companiesService };
  }

  const baseSale = {
    userName: 'cashier',
    pointOfSaleId: 'pos-1',
    cashSessionId: 'session-1',
    paymentMethod: 'CASH',
    deferPayment: true,
    customerId: 'cust-1',
    lines: [{ productVariantId: 'v1', quantity: 1, unitPrice: 1000 }],
  };

  it('rejects deferPayment when fulfilling a backorder', async () => {
    const { service, registerPosCommercial } = buildService();
    await expect(
      service.createSale({
        ...baseSale,
        fulfillBackorderId: 'bo-1',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(registerPosCommercial).not.toHaveBeenCalled();
  });

  it('rejects deferPayment when company policy is disabled', async () => {
    const { service, registerPosCommercial } = buildService({
      companyDeferredEnabled: false,
    });
    await expect(service.createSale(baseSale as never)).rejects.toThrow(
      'Venta sin pago no habilitada para este punto de venta',
    );
    expect(registerPosCommercial).not.toHaveBeenCalled();
  });

  it('rejects deferPayment when POS does not allow it', async () => {
    const { service, registerPosCommercial } = buildService({
      pos: {
        id: 'pos-1',
        companyId: 'company-1',
        settings: { kind: 'SALE', allowsDeferredPayment: false },
      },
    });
    await expect(service.createSale(baseSale as never)).rejects.toThrow(
      'Venta sin pago no habilitada para este punto de venta',
    );
    expect(registerPosCommercial).not.toHaveBeenCalled();
  });

  it('rejects deferPayment when POS is not found', async () => {
    const { service, registerPosCommercial } = buildService({ pos: null });
    await expect(service.createSale(baseSale as never)).rejects.toThrow(NotFoundException);
    expect(registerPosCommercial).not.toHaveBeenCalled();
  });

  it('passes deferPayment to registerPosCommercial when allowed', async () => {
    const { service, registerPosCommercial } = buildService();
    await service.createSale(baseSale as never);
    expect(registerPosCommercial).toHaveBeenCalledWith(
      expect.objectContaining({ deferPayment: true, customerId: 'cust-1' }),
      expect.objectContaining({ deferPayment: true }),
    );
  });
});
