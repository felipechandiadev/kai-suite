import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetTransactionByIdQueryHandler } from '@modules/transactions/application/handlers/queries/get-transaction-by-id.handler';
import { GetTransactionByIdQuery } from '@modules/transactions/application/queries/get-transaction-by-id.query';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('GetTransactionByIdQueryHandler', () => {
  let handler: GetTransactionByIdQueryHandler;
  let repository: { findOne: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionByIdQueryHandler,
        {
          provide: getRepositoryToken(TransactionOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetTransactionByIdQueryHandler);
  });

  it('should return null when transaction does not exist', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetTransactionByIdQuery('missing'))).resolves.toBeNull();
  });

  it('should map orm transaction to domain transaction', async () => {
    const now = new Date();
    repository.findOne.mockResolvedValueOnce({
      id: 'tx-1',
      documentNumber: 'DOC-1',
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      branchId: 'b-1',
      userId: 'u-1',
      pointOfSaleId: 'pos-1',
      cashSessionId: 'cs-1',
      storageId: 's-1',
      targetStorageId: 's-2',
      customerId: 'c-1',
      supplierId: 'sup-1',
      shareholderId: null,
      employeeId: null,
      expenseCategoryId: null,
      resultCenterId: null,
      accountingPeriodId: 'ap-1',
      subtotal: 100,
      taxAmount: 19,
      discountAmount: 5,
      total: 114,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      bankAccountKey: 'bank-key',
      documentType: 'invoice',
      documentFolio: 'F-1',
      paymentDueDate: now,
      amountPaid: 114,
      changeAmount: 0,
      relatedTransactionId: 'rel-1',
      externalReference: 'ext-1',
      notes: 'note',
      metadata: { source: 'test' },
      createdAt: now,
    });

    const result = await handler.execute(new GetTransactionByIdQuery('tx-1'));

    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-1' },
        relations: expect.arrayContaining(['branch', 'user', 'lines']),
      }),
    );
    expect(result).toMatchObject({
      id: 'tx-1',
      documentNumber: 'DOC-1',
      transactionType: TransactionType.SALE,
      total: 114,
    });
  });
});