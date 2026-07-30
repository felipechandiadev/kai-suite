import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ListTransactionsQueryHandler } from '@modules/transactions/application/handlers/queries/list-transactions.handler';
import { ListTransactionsQuery } from '@modules/transactions/application/queries/transaction-queries';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('ListTransactionsQueryHandler', () => {
  let handler: ListTransactionsQueryHandler;
  let repository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTransactionsQueryHandler,
        {
          provide: getRepositoryToken(TransactionOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(ListTransactionsQueryHandler);
  });

  it('should list transactions with pagination and filters', async () => {
    const now = new Date();
    queryBuilder.getCount.mockResolvedValueOnce(1);
    queryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'tx-1',
        documentNumber: 'DOC-1',
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        total: 100,
        paymentMethod: PaymentMethod.CASH,
        branchId: 'b-1',
        branch: { name: 'Branch 1' },
        userId: 'u-1',
        user: { userName: 'user1' },
        customerId: 'c-1',
        createdAt: now,
        lines: [{ id: 'l-1' }, { id: 'l-2' }],
      },
    ]);

    const result = await handler.execute(
      new ListTransactionsQuery(
        2,
        10,
        TransactionType.SALE,
        TransactionStatus.CONFIRMED,
        'c-1',
        'b-1',
        'u-1',
      ),
    );

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('t');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('t.transactionType = :transactionType', {
      transactionType: TransactionType.SALE,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('t.status = :status', {
      status: TransactionStatus.CONFIRMED,
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.transactions[0]).toMatchObject({
      id: 'tx-1',
      transactionNumber: 'DOC-1',
      itemCount: 2,
    });
  });

  it('should apply search and amount filters when provided', async () => {
    queryBuilder.getCount.mockResolvedValueOnce(0);
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await handler.execute(
      new ListTransactionsQuery(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        10,
        100,
        'needle',
      ),
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('t.totalAmount >= :minAmount', {
      minAmount: 10,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('t.totalAmount <= :maxAmount', {
      maxAmount: 100,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(t.transactionNumber ILIKE :search OR customer.name ILIKE :search OR t.notes ILIKE :search)',
      { search: '%needle%' },
    );
  });
});