import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import {
  PaymentStatus,
  TransactionType,
} from '../../../transactions/domain/transaction.entity';
import { CashSessionStatus } from '../../../cash-sessions/domain/cash-session.entity';
import {
  InstallmentSourceType,
  InstallmentStatus,
} from '../../../installments/domain/installment.entity';

describe('SalesFromSessionService — collectPendingQuotas', () => {
  const baseDto = {
    userName: 'cashier',
    pointOfSaleId: 'pos-1',
    cashSessionId: 'session-1',
    customerId: 'cust-1',
    installmentIds: ['inst-1'],
    payments: [{ paymentMethod: 'CASH', amount: 10000 }],
  };

  function buildService() {
    const pointOfSaleRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'pos-1', branchId: 'br-1', companyId: 'co-1' }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const cashSessionRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'session-1', status: CashSessionStatus.OPEN }),
    };
    const installmentRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'inst-1',
          installmentNumber: 1,
          sourceType: InstallmentSourceType.SALE,
          sourceTransactionId: 'sale-1',
          saleTransactionId: 'sale-1',
          status: InstallmentStatus.PENDING,
          amount: 10000,
          amountPaid: 0,
          saleTransaction: {
            id: 'sale-1',
            customerId: 'cust-1',
            documentNumber: 'VTA-1',
          },
        },
      ]),
    };
    const customerPaymentSourcesService = {
      validatePaymentsForCustomer: jest.fn().mockResolvedValue(undefined),
      applyPaymentsToSources: jest.fn().mockResolvedValue(undefined),
    };
    const companiesService = { getPaymentMethods: jest.fn().mockResolvedValue([]) };
    const transactionsService = {
      createTransaction: jest.fn().mockResolvedValue({
        id: 'pay-1',
        documentNumber: 'COB-CUOTA-1',
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: () => ({
            update: jest.fn().mockResolvedValue(undefined),
            find: jest.fn().mockResolvedValue([
              {
                id: 'inst-1',
                status: InstallmentStatus.PAID,
                amountPaid: 10000,
                amount: 10000,
              },
            ]),
            findOne: jest.fn().mockResolvedValue({
              id: 'sale-1',
              transactionType: TransactionType.SALE,
              total: 10000,
              amountPaid: 0,
              paymentStatus: PaymentStatus.PENDING,
            }),
          }),
        };
        return fn(manager);
      }),
    };

    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, {
      pointOfSaleRepository,
      userRepository,
      cashSessionRepository,
      installmentRepository,
      customerPaymentSourcesService,
      companiesService,
      transactionsService,
      dataSource,
    });

    return {
      service,
      transactionsService,
      installmentRepository,
    };
  }

  it('rejects when payment total is less than quota balance', async () => {
    const { service } = buildService();
    await expect(
      service.collectPendingQuotas({
        ...baseDto,
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects INTERNAL_CREDIT as payment method', async () => {
    const { service } = buildService();
    await expect(
      service.collectPendingQuotas({
        ...baseDto,
        payments: [{ paymentMethod: 'INTERNAL_CREDIT', amount: 10000 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates PAYMENT_IN with pos_quota_collection metadata', async () => {
    const { service, transactionsService } = buildService();
    const res = await service.collectPendingQuotas(baseDto);
    expect(res.success).toBe(true);
    expect(res.paymentIn.documentNumber).toBe('COB-CUOTA-1');
    expect(transactionsService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        cashSessionId: 'session-1',
        metadata: expect.objectContaining({
          source: 'pos_quota_collection',
          allocations: expect.arrayContaining([
            expect.objectContaining({
              installmentId: 'inst-1',
              saleTransactionId: 'sale-1',
              amount: 10000,
            }),
          ]),
        }),
      }),
    );
  });

  it('allows cash overpay and records changeAmount', async () => {
    const { service, transactionsService } = buildService();
    const res = await service.collectPendingQuotas({
      ...baseDto,
      payments: [{ paymentMethod: 'CASH', amount: 15000 }],
    });
    expect(res.success).toBe(true);
    expect(transactionsService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 15000,
        amountPaid: 15000,
        changeAmount: 5000,
      }),
    );
  });
});
