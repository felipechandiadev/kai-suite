import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetTransactionDetailQueryHandler } from '@modules/transactions/application/handlers/queries/get-transaction-detail.handler';
import { GetTransactionDetailQuery } from '@modules/transactions/application/queries/transaction-queries';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { CacheService } from '@shared/cache/cache.service';
import { TransactionDetailReadModel } from '@modules/transactions/application/read-models/transaction.read-models';

describe('GetTransactionDetailQueryHandler', () => {
  let handler: GetTransactionDetailQueryHandler;
  let repository: { findOne: jest.Mock };
  let cacheService: {
    getTransactionDetails: jest.Mock;
    setTransactionDetails: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
    };

    cacheService = {
      getTransactionDetails: jest.fn(),
      setTransactionDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionDetailQueryHandler,
        {
          provide: getRepositoryToken(TransactionOrmEntity),
          useValue: repository,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    handler = module.get(GetTransactionDetailQueryHandler);
  });

  it('should return cached transaction detail when available', async () => {
    const cached = new TransactionDetailReadModel(
      'tx-1',
      'DOC-1',
      TransactionType.SALE,
      TransactionStatus.CONFIRMED,
      100,
      PaymentMethod.CASH,
      null,
      { id: 'b-1', name: 'Branch 1' },
      { id: 'u-1', name: 'User 1', email: 'user@test.com' },
      [],
      [],
      new Date(),
      new Date(),
      new Date(),
    );
    cacheService.getTransactionDetails.mockResolvedValueOnce(cached);

    const result = await handler.execute(new GetTransactionDetailQuery('tx-1'));

    expect(result).toBe(cached);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('should throw when transaction detail is not found', async () => {
    cacheService.getTransactionDetails.mockResolvedValueOnce(null);
    repository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetTransactionDetailQuery('missing'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should build and cache a read model when not cached', async () => {
    const now = new Date();
    cacheService.getTransactionDetails.mockResolvedValueOnce(null);
    repository.findOne.mockResolvedValueOnce({
      id: 'tx-1',
      documentNumber: 'DOC-1',
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      total: 100,
      paymentMethod: PaymentMethod.CASH,
      customer: { id: 'c-1' },
      branch: { id: 'b-1', name: 'Branch 1', address: 'Address 1' },
      user: { id: 'u-1', userName: 'user1', mail: 'user@test.com' },
      lines: [
        {
          id: 'l-1',
          productId: 'p-1',
          product: { name: 'Product 1' },
          quantity: 2,
          unitPrice: 50,
          discountAmount: 0,
          total: 100,
        },
      ],
      payments: [],
      createdAt: now,
      notes: 'note',
    });

    const result = await handler.execute(new GetTransactionDetailQuery('tx-1'));

    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-1' },
        relations: expect.arrayContaining(['customer', 'branch', 'user', 'lines', 'payments']),
      }),
    );
    expect(cacheService.setTransactionDetails).toHaveBeenCalledWith('tx-1', result);
    expect(result).toBeInstanceOf(TransactionDetailReadModel);
    expect(result.id).toBe('tx-1');
    expect(result.lines).toHaveLength(1);
  });
});