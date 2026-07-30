import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AccountingEngineListener } from './accounting-engine.listener';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

describe('AccountingEngineListener', () => {
  let listener: AccountingEngineListener;
  let ledgerService: LedgerEntriesService;
  let dataSource: DataSource;

  const mockTransaction: Transaction = {
    id: 'tx-1',
    companyId: 'company-1',
    documentNumber: 'REM-000001',
    transactionType: TransactionType.PAYROLL,
    status: TransactionStatus.CONFIRMED,
    branchId: 'branch-1',
    userId: 'user-1',
    total: 539500,
    subtotal: 650000,
    taxAmount: 0,
    discountAmount: 110500,
    paymentMethod: PaymentMethod.CASH,
    amountPaid: 0,
    createdAt: new Date('2026-02-21'),
    lines: [],
    metadata: {
      remuneration: true,
      payrollDate: '2026-02-21',
      lines: [
        { typeId: 'ORDINARY', amount: 650000 },
        { typeId: 'AFP', amount: -65000 },
        { typeId: 'HEALTH_INSURANCE', amount: -45500 },
      ],
      totalEarnings: 650000,
      totalDeductions: 110500,
      netPayment: 539500,
    },
  } as Transaction;

  const mockLedgerService = {
    generateEntriesForTransaction: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingEngineListener,
        {
          provide: LedgerEntriesService,
          useValue: mockLedgerService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    listener = module.get<AccountingEngineListener>(AccountingEngineListener);
    ledgerService = module.get<LedgerEntriesService>(LedgerEntriesService);
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleTransactionCreated', () => {
    it('should call ledger service when transaction is created', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'SUCCESS',
        entriesGenerated: 4,
        errors: [],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      // Act
      await listener.handleTransactionCreated(event);

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(
        mockLedgerService.generateEntriesForTransaction,
      ).toHaveBeenCalledWith(
        mockTransaction,
        'company-1',
        expect.anything(), // EntityManager
      );
    });

    it('should handle PAYROLL transactions', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'SUCCESS',
        entriesGenerated: 4,
        errors: [],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      // Act
      await listener.handleTransactionCreated(event);

      // Assert
      expect(
        mockLedgerService.generateEntriesForTransaction,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: TransactionType.PAYROLL,
          documentNumber: 'REM-000001',
        }),
        'company-1',
        expect.anything(),
      );
    });

    it('should throw error if ledger generation fails', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'REJECTED',
        entriesGenerated: 0,
        errors: [{ code: 'BALANCE_MISMATCH', message: 'DEBE ≠ HABER' }],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      // Act & Assert
      await expect(listener.handleTransactionCreated(event)).rejects.toThrow(
        /Accounting engine rejected transaction/,
      );
    });

    it('should handle multiple transaction types', async () => {
      // Test that listener works for all transaction types
      const types = [
        TransactionType.PAYROLL,
        TransactionType.SALE,
        TransactionType.PURCHASE,
        TransactionType.OPERATING_EXPENSE,
      ];

      for (const type of types) {
        const tx = { ...mockTransaction, transactionType: type } as Transaction;
        const event = new TransactionCreatedEvent(tx, 'company-1');

        mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
          status: 'SUCCESS',
          entriesGenerated: 2,
          errors: [],
        });

        mockDataSource.transaction.mockImplementation(async (cb) => {
          await cb({} as any);
        });

        await listener.handleTransactionCreated(event);

        expect(
          mockLedgerService.generateEntriesForTransaction,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ transactionType: type }),
          'company-1',
          expect.anything(),
        );

        jest.clearAllMocks();
      }
    });

    it('should use database transaction for isolation', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'SUCCESS',
        entriesGenerated: 4,
        errors: [],
      });

      const mockManager = { getRepository: jest.fn() };
      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb(mockManager);
      });

      // Act
      await listener.handleTransactionCreated(event);

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(
        mockLedgerService.generateEntriesForTransaction,
      ).toHaveBeenCalledWith(expect.anything(), expect.anything(), mockManager);
    });

    it('should log success when entries are generated', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'SUCCESS',
        entriesGenerated: 4,
        errors: [],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      const loggerSpy = jest.spyOn((listener as any).logger, 'log');

      // Act
      await listener.handleTransactionCreated(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transaction created event detected'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 4 entries'),
      );
    });

    it('should log error when generation fails', async () => {
      // Arrange
      const event = new TransactionCreatedEvent(mockTransaction, 'company-1');

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'REJECTED',
        entriesGenerated: 0,
        errors: [
          { code: 'ACCOUNT_NOT_FOUND', message: 'Account 5.3.01 not found' },
        ],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      const loggerErrorSpy = jest.spyOn((listener as any).logger, 'error');

      // Act
      try {
        await listener.handleTransactionCreated(event);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('FAILED to generate entries'),
      );
    });
  });

  describe('Event integration', () => {
    it('should handle concurrent transaction events', async () => {
      // Arrange
      const events = [
        new TransactionCreatedEvent(
          { ...mockTransaction, id: 'tx-1' } as Transaction,
          'company-1',
        ),
        new TransactionCreatedEvent(
          { ...mockTransaction, id: 'tx-2' } as Transaction,
          'company-1',
        ),
        new TransactionCreatedEvent(
          { ...mockTransaction, id: 'tx-3' } as Transaction,
          'company-1',
        ),
      ];

      mockLedgerService.generateEntriesForTransaction.mockResolvedValue({
        status: 'SUCCESS',
        entriesGenerated: 4,
        errors: [],
      });

      mockDataSource.transaction.mockImplementation(async (cb) => {
        await cb({} as any);
      });

      // Act
      await Promise.all(
        events.map((e) => listener.handleTransactionCreated(e)),
      );

      // Assert
      expect(
        mockLedgerService.generateEntriesForTransaction,
      ).toHaveBeenCalledTimes(3);
    });
  });
});
