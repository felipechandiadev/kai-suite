import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { TransactionsServiceAdapter } from '@modules/transactions/application/transactions.service.adapter';
import { GetTransactionByIdQuery } from '@modules/transactions/application/queries/get-transaction-by-id.query';
import {
  GetCustomerTransactionHistoryQuery,
  GetTransactionDetailQuery,
  GetTransactionSummaryQuery,
  ListTransactionsQuery,
} from '@modules/transactions/application/queries/transaction-queries';

describe('TransactionsServiceAdapter', () => {
  let service: TransactionsServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(TransactionsServiceAdapter);
  });

  it('should dispatch GetTransactionByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getTransactionById('tx-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetTransactionByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ id: 'tx-1' });
  });

  it('should dispatch GetTransactionSummaryQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getTransactionSummary('tx-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetTransactionSummaryQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ transactionId: 'tx-1' });
  });

  it('should dispatch GetTransactionDetailQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getTransactionDetail('tx-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetTransactionDetailQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ transactionId: 'tx-1' });
  });

  it('should dispatch ListTransactionsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ transactions: [] });

    await service.listTransactions(2, 30, 'SALE' as any, 'CONFIRMED' as any, 'c-1', 'b-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(ListTransactionsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      page: 2,
      limit: 30,
      transactionType: 'SALE',
      status: 'CONFIRMED',
      customerId: 'c-1',
      branchId: 'b-1',
    });
  });

  it('should dispatch GetCustomerTransactionHistoryQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getCustomerTransactionHistory('c-1', 3, 15);

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(
      GetCustomerTransactionHistoryQuery,
    );
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      customerId: 'c-1',
      page: 3,
      limit: 15,
    });
  });
});