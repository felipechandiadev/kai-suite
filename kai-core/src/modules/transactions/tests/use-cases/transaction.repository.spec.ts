import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../../domain/transaction.entity';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';

describe('TransactionRepository', () => {
  let repository: TransactionRepository;
  let mockTransactionRepo: jest.Mocked<Repository<Transaction>>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRepository,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<TransactionRepository>(TransactionRepository);
    mockTransactionRepo = module.get(getRepositoryToken(Transaction));
  });

  describe('findRelatedTo', () => {
    it('should return inverse relations for a transaction', async () => {
      const transactionId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTransaction = {
        id: transactionId,
        inverseRelations: [
          { id: 'payment-1', transactionType: TransactionType.PAYMENT_IN },
          {
            id: 'payment-2',
            transactionType: TransactionType.PAYMENT_EXECUTION,
          },
        ],
      };

      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction as any);

      const result = await repository.findRelatedTo(transactionId);

      expect(mockTransactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: transactionId },
        relations: ['inverseRelations'],
      });
      expect(result).toEqual(mockTransaction.inverseRelations);
    });

    it('should return empty array if transaction has no inverse relations', async () => {
      const transactionId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTransaction = {
        id: transactionId,
        inverseRelations: [],
      };

      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction as any);

      const result = await repository.findRelatedTo(transactionId);

      expect(result).toEqual([]);
    });

    it('should return empty array if transaction not found', async () => {
      const transactionId = '123e4567-e89b-12d3-a456-426614174000';

      mockTransactionRepo.findOne.mockResolvedValue(null);

      const result = await repository.findRelatedTo(transactionId);

      expect(result).toEqual([]);
    });
  });

  describe('findChildrenOf', () => {
    it('should return children transactions ordered by creation date', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockChildren = [
        { id: 'child-1', createdAt: new Date('2023-01-01') },
        { id: 'child-2', createdAt: new Date('2023-01-02') },
      ];

      mockTransactionRepo.find.mockResolvedValue(mockChildren as any);

      const result = await repository.findChildrenOf(parentId);

      expect(mockTransactionRepo.find).toHaveBeenCalledWith({
        where: { parentTransactionId: parentId },
        relations: [
          'relatedTransaction',
          'inverseRelations',
          'parent',
          'children',
        ],
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockChildren);
    });
  });
});
