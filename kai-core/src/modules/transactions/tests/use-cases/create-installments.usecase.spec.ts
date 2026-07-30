import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateInstallmentsUseCase,
  CreateInstallmentsCommand,
} from '../../application/use-cases/create-installments.usecase';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { InstallmentRepositoryPort } from '../../application/ports/installment.repository.port';
import { Transaction, TransactionType } from '../../domain/transaction.entity';
import {
  Installment,
  InstallmentStatus,
} from '../../domain/installment.entity';

describe('CreateInstallmentsUseCase', () => {
  let useCase: CreateInstallmentsUseCase;
  let mockTransactionRepo: jest.Mocked<any>;
  let mockInstallmentRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const mockTransactionRepoObj = {
      findById: jest.fn(),
    };
    const mockInstallmentRepoObj = {
      findByTransactionId: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInstallmentsUseCase,
        {
          provide: 'TransactionRepositoryPort',
          useValue: mockTransactionRepoObj,
        },
        {
          provide: 'InstallmentRepositoryPort',
          useValue: mockInstallmentRepoObj,
        },
      ],
    }).compile();

    useCase = module.get<CreateInstallmentsUseCase>(CreateInstallmentsUseCase);
    mockTransactionRepo = module.get('TransactionRepositoryPort');
    mockInstallmentRepo = module.get('InstallmentRepositoryPort');
  });

  it('should create installments for a SALE transaction', async () => {
    const transactionId = '123e4567-e89b-12d3-a456-426614174000';
    const mockTransaction = {
      id: transactionId,
      transactionType: TransactionType.SALE,
      total: 3000,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(mockTransaction);
    mockInstallmentRepo.findByTransactionId.mockResolvedValue([]);
    mockInstallmentRepo.save.mockImplementation((installment) =>
      Promise.resolve(installment),
    );

    const command = new CreateInstallmentsCommand(
      transactionId,
      3,
      new Date('2024-02-01'),
    );

    const result = await useCase.execute(command);

    expect(result).toHaveLength(3);
    expect(result[0].installmentNumber).toBe(1);
    expect(result[0].amount).toBe(1000);
    expect(result[0].status).toBe(InstallmentStatus.PENDING);
    expect(result[2].amount).toBe(1000); // Última cuota ajustada por redondeo
  });

  it('should throw error for non-existent transaction', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const command = new CreateInstallmentsCommand(
      'invalid-id',
      3,
      new Date('2024-02-01'),
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      'Transacción invalid-id no encontrada',
    );
  });

  it('should throw error for invalid transaction type', async () => {
    const mockTransaction = {
      id: '123',
      transactionType: TransactionType.PAYMENT_IN,
      total: 1000,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(mockTransaction);

    const command = new CreateInstallmentsCommand(
      '123',
      3,
      new Date('2024-02-01'),
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      'Tipo de transacción PAYMENT_IN no permite cuotas',
    );
  });

  it('should throw error for existing installments', async () => {
    const mockTransaction = {
      id: '123',
      transactionType: TransactionType.SALE,
      total: 1000,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(mockTransaction);
    mockInstallmentRepo.findByTransactionId.mockResolvedValue([
      {} as Installment,
    ]);

    const command = new CreateInstallmentsCommand(
      '123',
      3,
      new Date('2024-02-01'),
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      'La transacción ya tiene cuotas creadas',
    );
  });
});
