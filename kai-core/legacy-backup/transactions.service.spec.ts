import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, DataSource } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionType, TransactionStatus, PaymentStatus } from '../domain/transaction.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { AccountingPeriodsService } from '@modules/accounting-periods/application/accounting-periods.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: Repository<Transaction>;
  let branchRepository: Repository<Branch>;
  let dataSource: DataSource;
  let ledgerService: LedgerEntriesService;
  let eventEmitter: EventEmitter2;
  let accountingPeriodsService: AccountingPeriodsService;

  const mockBranch = {
    id: 'branch-1',
    companyId: 'company-1',
    name: 'Sucursal Principal',
  };

  const mockPeriod = {
    id: 'period-1',
    code: '2026-02',
    year: 2026,
    month: 2,
    status: 'OPEN',
  };

  const mockTransaction = {
    id: 'tx-1',
    documentNumber: 'REM-000001',
    transactionType: TransactionType.PAYROLL,
    status: TransactionStatus.CONFIRMED,
    branchId: 'branch-1',
    total: 539500,
    subtotal: 650000,
    discountAmount: 110500,
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
    createdAt: new Date(),
  };

  const mockTransactionRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBranchRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockLedgerService = {
    generateEntriesForTransaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAccountingPeriodsService = {
    ensurePeriod: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: mockBranchRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: LedgerEntriesService,
          useValue: mockLedgerService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: AccountingPeriodsService,
          useValue: mockAccountingPeriodsService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepository = module.get(getRepositoryToken(Transaction));
    branchRepository = module.get(getRepositoryToken(Branch));
    dataSource = module.get<DataSource>(DataSource);
    ledgerService = module.get<LedgerEntriesService>(LedgerEntriesService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    accountingPeriodsService = module.get<AccountingPeriodsService>(AccountingPeriodsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMovementsForSession', () => {
    it('should map transactions to movement objects', async () => {
      const dummyDate = new Date();
      const dummyTx = {
        id: 't1',
        transactionType: TransactionType.SALE,
        documentNumber: 'INV-001',
        createdAt: dummyDate,
        total: 123.45,
        paymentMethod: PaymentMethod.CASH,
        userId: 'u1',
        user: { id: 'u1', userName: 'usr', person: { firstName: 'Foo', lastName: 'Bar' } },
        notes: 'test note',
        metadata: {},
      } as any;
      (mockTransactionRepository.find as jest.Mock).mockResolvedValue([dummyTx]);

      const movements = await service.getMovementsForSession('session-1');
      expect(movements).toHaveLength(1);
      expect(movements[0].id).toBe('t1');
      expect(movements[0].direction).toBe('IN');
      expect(movements[0].userFullName).toBe('Foo Bar');
    });
  });

  describe('createTransaction', () => {
    it('should create a PAYROLL transaction and emit event', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL;
      dto.branchId = 'branch-1';
      dto.subtotal = 650000;
      dto.discountAmount = 110500;
      dto.total = 539500;
      dto.paymentStatus = PaymentStatus.PENDING;
      dto.metadata = mockTransaction.metadata;

      mockBranchRepository.findOne.mockResolvedValue(mockBranch);
      mockAccountingPeriodsService.ensurePeriod.mockResolvedValue(mockPeriod);

      mockDataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(mockTransaction),
          }),
        };
        return cb(mockManager);
      });

      // Act
      const result = await service.createTransaction(dto);

      // Assert
      expect(mockBranchRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'branch-1' },
      });
      expect(mockAccountingPeriodsService.ensurePeriod).toHaveBeenCalledWith(
        'company-1',
        expect.any(Date),
      );
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'transaction.created',
        expect.objectContaining({
          transaction: expect.objectContaining({
            transactionType: TransactionType.PAYROLL,
          }),
          companyId: 'company-1',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should reject transaction with invalid DTO', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL;
      // Missing required fields (branchId, totals)

      // Act & Assert
      await expect(service.createTransaction(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject transaction if branch not found', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL;
      dto.branchId = 'invalid-branch';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentStatus = PaymentStatus.PAID;

      mockBranchRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createTransaction(dto)).rejects.toThrow(BadRequestException);
      expect(mockBranchRepository.findOne).toHaveBeenCalled();
    });

    it('should clamp excessive taxRate values when saving lines', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SALE;
      dto.branchId = 'branch-1';
      dto.userId = 'user-1';
      dto.subtotal = 100;
      dto.taxAmount = 1900;
      dto.total = 2000;
      dto.paymentStatus = PaymentStatus.PAID;
      dto.lines = [
        {
          productName: 'Test item',
          quantity: 1,
          unitPrice: 100,
          taxRate: 1900, // absurd value
          taxAmount: 1900,
          subtotal: 100,
          total: 2000,
        } as any,
      ];

      mockBranchRepository.findOne.mockResolvedValue(mockBranch);
      mockAccountingPeriodsService.ensurePeriod.mockResolvedValue(mockPeriod);

      const savedLines: any[] = [];
      mockDataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockImplementation((arg: any) => {
              if (Array.isArray(arg)) savedLines.push(...arg);
              return arg;
            }),
          }),
        };
        return cb(mockManager);
      });

      // Act
      const result = await service.createTransaction(dto);

      // Assert: 1900 should be scaled down to 19
      expect(savedLines[0].taxRate).toBeCloseTo(19);
    });

    it('should handle metadata with payroll lines correctly', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL;
      dto.branchId = 'branch-1';
      dto.subtotal = 700000;
      dto.discountAmount = 95750;
      dto.total = 604250;
      dto.paymentStatus = PaymentStatus.PENDING;
      dto.metadata = {
        remuneration: true,
        payrollDate: '2026-02-21',
        lines: [
          { typeId: 'ORDINARY', amount: 450000 },
          { typeId: 'OVERTIME', amount: 50000 },
          { typeId: 'BONUS', amount: 200000 },
          { typeId: 'AFP', amount: -60000 },
          { typeId: 'HEALTH_INSURANCE', amount: -35750 },
        ],
        totalEarnings: 700000,
        totalDeductions: 95750,
        netPayment: 604250,
      };

      mockBranchRepository.findOne.mockResolvedValue(mockBranch);
      mockAccountingPeriodsService.ensurePeriod.mockResolvedValue(mockPeriod);

      mockDataSource.transaction.mockImplementation(async (cb) => {
        const savedTx = { ...mockTransaction, metadata: dto.metadata };
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(savedTx),
          }),
        };
        return cb(mockManager);
      });

      // Act
      const result = await service.createTransaction(dto);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'transaction.created',
        expect.objectContaining({
          transaction: expect.objectContaining({
            metadata: expect.objectContaining({
              lines: expect.arrayContaining([
                expect.objectContaining({ typeId: 'ORDINARY', amount: 450000 }),
                expect.objectContaining({ typeId: 'AFP', amount: -60000 }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      // Arrange
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      // Act
      const result = await service.findOne('tx-1');

      // Assert
      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null if transaction not found', async () => {
      // Arrange
      mockTransactionRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne('invalid-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listJournal', () => {
    it('should return journal entries with pagination', async () => {
      // Arrange
      const mockJournalData = [
        {
          le_id: 'entry-1',
          entryDate: new Date(),
          le_description: 'Sueldos y salarios',
          debit: 650000,
          credit: 0,
          code: '5.3.01',
          name: 'Sueldos y salarios',
          t_id: 'tx-1',
          documentNumber: 'REM-000001',
          transactionType: 'PAYROLL',
          status: 'COMPLETED',
        },
        {
          le_id: 'entry-2',
          entryDate: new Date(),
          le_description: 'AFP por pagar',
          debit: 0,
          credit: 65000,
          code: '2.2.02',
          name: 'AFP por pagar',
          t_id: 'tx-1',
          documentNumber: 'REM-000001',
          transactionType: 'PAYROLL',
          status: 'COMPLETED',
        },
      ];

      mockDataSource.query
        .mockResolvedValueOnce([{ total: 4 }]) // count query
        .mockResolvedValueOnce(mockJournalData); // data query

      mockTransactionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.listJournal({
        page: 1,
        pageSize: 25,
        type: TransactionType.PAYROLL as any,
      });

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.rows[0]).toMatchObject({
        id: 'entry-1',
        accountCode: '5.3.01',
        debit: 650000,
        credit: 0,
      });
    });

    it('should filter journal by date range', async () => {
      // Arrange
      mockDataSource.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      mockTransactionRepository.find.mockResolvedValue([]);

      // Act
      await service.listJournal({
        page: 1,
        pageSize: 25,
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
      });

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('le.entryDate >='),
        expect.arrayContaining([expect.any(Date), expect.any(Date)]),
      );
    });

    it('should filter journal by transaction type', async () => {
      // Arrange
      mockDataSource.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      mockTransactionRepository.find.mockResolvedValue([]);

      // Act
      await service.listJournal({
        page: 1,
        pageSize: 25,
        type: TransactionType.PAYROLL as any,
      });

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('t.transactionType = ?'),
        expect.arrayContaining(['PAYROLL']),
      );
    });
  });

  describe('Event emission', () => {
    it('should emit transaction.created event with correct payload', async () => {
      // Arrange
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL;
      dto.branchId = 'branch-1';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentStatus = PaymentStatus.PAID;

      mockBranchRepository.findOne.mockResolvedValue(mockBranch);
      mockAccountingPeriodsService.ensurePeriod.mockResolvedValue(mockPeriod);

      mockDataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(mockTransaction),
          }),
        };
        return cb(mockManager);
      });

      // Act
      await service.createTransaction(dto);

      // Assert
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'transaction.created',
        expect.objectContaining({
          transaction: expect.any(Object),
          companyId: 'company-1',
        }),
      );
    });
  });
});
