import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import { CashSessionStatus } from '../../../cash-sessions/domain/cash-session.entity';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('SalesFromSessionService — payoutCustomerCreditNotes', () => {
  const baseDto = {
    userName: 'cashier',
    pointOfSaleId: 'pos-1',
    cashSessionId: 'session-1',
    customerId: 'cust-1',
    creditNoteTransactionIds: ['nc-1'],
    payments: [{ paymentMethod: 'CASH', amount: 5000 }],
  };

  function buildService(availableAmount = 5000) {
    const pointOfSaleRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'pos-1', branchId: 'br-1', companyId: 'co-1' }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const cashSessionRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'session-1', status: CashSessionStatus.OPEN }),
    };
    const customerPaymentSourcesService = {
      listForCustomer: jest.fn().mockResolvedValue({
        creditNotes: [
          {
            id: 'nc-1',
            documentNumber: 'NC-1',
            total: 5000,
            consumedAmount: 0,
            availableAmount,
            createdAt: new Date().toISOString(),
          },
        ],
        orderAdvances: [],
      }),
      consumeCreditNoteForPayout: jest.fn().mockResolvedValue(undefined),
    };
    const companiesService = { getPaymentMethods: jest.fn().mockResolvedValue([]) };
    const transactionsService = {
      createTransaction: jest.fn().mockResolvedValue({
        id: 'pay-out-1',
        documentNumber: 'DEV-1',
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    };

    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, {
      pointOfSaleRepository,
      userRepository,
      cashSessionRepository,
      customerPaymentSourcesService,
      companiesService,
      transactionsService,
      dataSource,
    });

    return {
      service,
      customerPaymentSourcesService,
      transactionsService,
    };
  }

  it('rejects when payment total does not match NC available total', async () => {
    const { service } = buildService();
    await expect(
      service.payoutCustomerCreditNotes({
        ...baseDto,
        payments: [{ paymentMethod: 'CASH', amount: 1000 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects credit or debit card as payout method', async () => {
    const { service } = buildService();
    await expect(
      service.payoutCustomerCreditNotes({
        ...baseDto,
        payments: [{ paymentMethod: 'CREDIT_CARD', amount: 5000 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates payout tx and consumes full NC balance', async () => {
    const { service, transactionsService, customerPaymentSourcesService } =
      buildService();
    const res = await service.payoutCustomerCreditNotes(baseDto);
    expect(res.success).toBe(true);
    expect(res.payout.documentNumber).toBe('DEV-1');
    expect(transactionsService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT,
        changeAmount: 0,
        metadata: expect.objectContaining({
          allocations: expect.arrayContaining([
            expect.objectContaining({ creditNoteId: 'nc-1', amount: 5000 }),
          ]),
        }),
      }),
    );
    expect(customerPaymentSourcesService.consumeCreditNoteForPayout).toHaveBeenCalledWith(
      'nc-1',
      5000,
      'pay-out-1',
      'cust-1',
    );
  });
});
