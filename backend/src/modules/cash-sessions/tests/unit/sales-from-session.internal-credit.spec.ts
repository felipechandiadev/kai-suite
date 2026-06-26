import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';

describe('SalesFromSessionService — INTERNAL_CREDIT validation', () => {
  function buildService(overrides: Record<string, unknown> = {}) {
    const service = Object.create(
      SalesFromSessionService.prototype,
    ) as SalesFromSessionService;
    Object.assign(service, {
      pointOfSaleRepository: {
        findOne: jest.fn().mockResolvedValue({ id: 'pos-1', companyId: 'co-1' }),
      },
      companiesService: {
        getInternalCustomerCreditContext: jest.fn().mockResolvedValue({
          internalCustomerCredit: { enabled: true },
          internalCreditPaymentMethod: { id: 'pm-ic', label: 'Crédito interno' },
        }),
      },
      customersService: {
        findOne: jest.fn().mockResolvedValue({ availableCredit: 50000 }),
      },
      ...overrides,
    });
    return service;
  }

  it('rejects when internal credit exceeds customer available', async () => {
    const service = buildService();
    await expect(
      (service as any).assertInternalCreditPaymentsAllowed('pos-1', 'cust-1', [
        { paymentMethod: 'INTERNAL_CREDIT', amount: 80000 },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows when internal credit is within available', async () => {
    const service = buildService();
    await expect(
      (service as any).assertInternalCreditPaymentsAllowed('pos-1', 'cust-1', [
        { paymentMethod: 'INTERNAL_CREDIT', amount: 30000 },
      ]),
    ).resolves.toBeUndefined();
  });

  it('skips when no INTERNAL_CREDIT payments', async () => {
    const service = buildService();
    const companiesService = (service as any).companiesService;
    await (service as any).assertInternalCreditPaymentsAllowed('pos-1', 'cust-1', [
      { paymentMethod: 'CASH', amount: 10000 },
    ]);
    expect(companiesService.getInternalCustomerCreditContext).not.toHaveBeenCalled();
  });
});
