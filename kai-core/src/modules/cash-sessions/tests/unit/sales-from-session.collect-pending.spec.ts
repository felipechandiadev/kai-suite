import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import {
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '../../../transactions/domain/transaction.entity';
import { CashSessionStatus } from '../../../cash-sessions/domain/cash-session.entity';

describe('SalesFromSessionService — collectPendingSales', () => {
  const baseDto = {
    userName: 'cashier',
    pointOfSaleId: 'pos-1',
    cashSessionId: 'session-1',
    customerId: 'cust-1',
    saleTransactionIds: ['sale-1'],
    payments: [{ paymentMethod: 'CASH', amount: 5000 }],
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
    const transactionRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'sale-1',
          customerId: 'cust-1',
          transactionType: TransactionType.SALE,
          paymentStatus: PaymentStatus.PENDING,
          status: TransactionStatus.CONFIRMED,
          total: 5000,
          amountPaid: 0,
          documentNumber: 'VTA-1',
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
        documentNumber: 'COB-1',
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: () => ({
            update: jest.fn().mockResolvedValue(undefined),
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
      transactionRepository,
      customerPaymentSourcesService,
      companiesService,
      transactionsService,
      dataSource,
    });

    return {
      service,
      transactionRepository,
      customerPaymentSourcesService,
      transactionsService,
    };
  }

  it('rejects when payment total is less than sale balance', async () => {
    const { service } = buildService();
    await expect(
      service.collectPendingSales({
        ...baseDto,
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates PAYMENT_IN and marks sales PAID when totals match', async () => {
    const { service, transactionsService } = buildService();
    const res = await service.collectPendingSales(baseDto);
    expect(res.success).toBe(true);
    expect(res.paymentIn.documentNumber).toBe('COB-1');
    expect(transactionsService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAmount: 0,
        metadata: expect.objectContaining({
          source: 'pos_ar_collection',
          allocations: expect.arrayContaining([
            expect.objectContaining({ saleId: 'sale-1', amount: 5000 }),
          ]),
        }),
      }),
    );
  });

  it('allows cash overpay and records changeAmount', async () => {
    const { service, transactionsService } = buildService();
    const res = await service.collectPendingSales({
      ...baseDto,
      payments: [{ paymentMethod: 'CASH', amount: 10000 }],
    });
    expect(res.success).toBe(true);
    expect(transactionsService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 10000,
        amountPaid: 10000,
        changeAmount: 5000,
      }),
    );
  });
});
