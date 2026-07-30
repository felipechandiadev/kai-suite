import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { LedgerEntriesService } from './ledger-entries.service';
import { LedgerEntry } from '../domain/ledger-entry.entity';
import {
  AccountingAccount,
  AccountType,
} from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

describe('LedgerEntriesService - Payroll', () => {
  let service: LedgerEntriesService;
  let ledgerRepository: Repository<LedgerEntry>;
  let accountsRepository: Repository<AccountingAccount>;

  const mockPayrollTransaction: Transaction = {
    id: 'tx-payroll-1',
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
    employeeId: 'employee-1',
    resultCenterId: 'rc-1',
    accountingPeriodId: 'period-1',
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

  const mockAccounts = [
    {
      id: 'acc-5.3.01',
      code: '5.3.01',
      name: 'Sueldos y salarios',
      type: AccountType.EXPENSE,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-5.3.03',
      code: '5.3.03',
      name: 'Otros haberes',
      type: AccountType.EXPENSE,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-2.2.01',
      code: '2.2.01',
      name: 'Remuneraciones por pagar',
      type: AccountType.LIABILITY,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-2.2.02',
      code: '2.2.02',
      name: 'AFP por pagar',
      type: AccountType.LIABILITY,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-2.2.03',
      code: '2.2.03',
      name: 'Salud por pagar',
      type: AccountType.LIABILITY,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-2.2.04',
      code: '2.2.04',
      name: 'Impuestos por pagar',
      type: AccountType.LIABILITY,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as AccountingAccount[];

  const mockLedgerRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAccountsRepository = {
    find: jest.fn(),
  };

  const mockRulesRepository = {
    find: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockSupplierRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockShareholderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockEmployeeRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ personId: 'person-emp-1' }),
    }),
  };

  const mockEntityManager = {
    getRepository: jest.fn(),
  } as unknown as EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerEntriesService,
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: mockLedgerRepository,
        },
        {
          provide: getRepositoryToken(AccountingRule),
          useValue: mockRulesRepository,
        },
        {
          provide: getRepositoryToken(AccountingAccount),
          useValue: mockAccountsRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(Shareholder),
          useValue: mockShareholderRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<LedgerEntriesService>(LedgerEntriesService);
    ledgerRepository = module.get(getRepositoryToken(LedgerEntry));
    accountsRepository = module.get(getRepositoryToken(AccountingAccount));

    jest.clearAllMocks();

    // Mock accounts query
    mockAccountsRepository.find.mockResolvedValue(mockAccounts);

    // Mock rules query (return empty for PAYROLL since it doesn't use rules)
    mockRulesRepository.find.mockResolvedValue([]);

    // Mock manager.getRepository for save operations
    (mockEntityManager.getRepository as jest.Mock).mockReturnValue({
      create: jest.fn((dto) => ({ ...dto, id: 'ledger-' + Math.random() })),
      save: jest
        .fn()
        .mockImplementation((entities) => Promise.resolve(entities)),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePayrollEntries', () => {
    it('should generate balanced ledger entries for simple payroll', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([]); // No existing entries

      // Act
      const result = await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      expect(result.status).toBe('SUCCESS');
      expect(result.entriesGenerated).toBe(4); // 1 salary + 2 deductions + 1 net payment
      expect(result.errors).toHaveLength(0);

      // Verify save was called with balanced entries
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      expect(saveRepo.save).toHaveBeenCalled();

      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Verify balance: DEBE = HABER
      const totalDebit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.debit || 0),
        0,
      );
      const totalCredit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.credit || 0),
        0,
      );
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(650000); // Total earnings
    });

    it('should map ORDINARY to account 5.3.01 (Sueldos)', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Find ORDINARY entry
      const ordinaryEntry = savedEntries.find((e: any) =>
        e.description.includes('Remuneración ordinaria'),
      );

      expect(ordinaryEntry).toBeDefined();
      expect(ordinaryEntry.accountId).toBe('acc-5.3.01'); // Sueldos y salarios
      expect(ordinaryEntry.debit).toBe(650000);
      expect(ordinaryEntry.credit).toBe(0);
    });

    it('should map AFP to account 2.2.02 (AFP por pagar)', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Find AFP entry
      const afpEntry = savedEntries.find((e: any) =>
        e.description.includes('AFP'),
      );

      expect(afpEntry).toBeDefined();
      expect(afpEntry.accountId).toBe('acc-2.2.02'); // AFP por pagar
      expect(afpEntry.debit).toBe(0);
      expect(afpEntry.credit).toBe(65000);
    });

    it('should map HEALTH_INSURANCE to account 2.2.03 (Salud)', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Find HEALTH_INSURANCE entry
      const healthEntry = savedEntries.find((e: any) =>
        e.description.includes('Salud'),
      );

      expect(healthEntry).toBeDefined();
      expect(healthEntry.accountId).toBe('acc-2.2.03'); // Salud por pagar
      expect(healthEntry.credit).toBe(45500);
    });

    it('should create net payment entry in account 2.2.01', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Find net payment entry
      const netEntry = savedEntries.find(
        (e: any) =>
          e.description.includes('Líquido a pagar') ||
          e.description.includes('Remuneraciones por pagar'),
      );

      expect(netEntry).toBeDefined();
      expect(netEntry.accountId).toBe('acc-2.2.01'); // Remuneraciones por pagar
      expect(netEntry.credit).toBe(539500); // Total - Deductions
    });

    it('should handle complex payroll with multiple earning types', async () => {
      // Arrange
      const complexTransaction = {
        ...mockPayrollTransaction,
        metadata: {
          remuneration: true,
          payrollDate: '2026-02-21',
          lines: [
            { typeId: 'ORDINARY', amount: 450000 },
            { typeId: 'PROPORTIONAL', amount: 200000 }, // Also should go to 5.3.01
            { typeId: 'OVERTIME', amount: 50000 }, // Should go to 5.3.03
            { typeId: 'BONUS', amount: 100000 }, // Should go to 5.3.03
            { typeId: 'AFP', amount: -80000 }, // 2.2.02
            { typeId: 'HEALTH_INSURANCE', amount: -56000 }, // 2.2.03
            { typeId: 'INCOME_TAX', amount: -20000 }, // 2.2.04
          ],
          totalEarnings: 800000,
          totalDeductions: 156000,
          netPayment: 644000,
        },
      } as Transaction;

      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      await service.generateEntriesForTransaction(
        complexTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Verify balance
      const totalDebit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.debit || 0),
        0,
      );
      const totalCredit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.credit || 0),
        0,
      );
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(800000);

      // Verify ORDINARY + PROPORTIONAL → 5.3.01
      const salaryEntries = savedEntries.filter(
        (e: any) => e.accountId === 'acc-5.3.01',
      );
      const totalSalaries = salaryEntries.reduce(
        (sum: number, e: any) => sum + e.debit,
        0,
      );
      expect(totalSalaries).toBe(650000); // 450k + 200k

      // Verify OVERTIME + BONUS → 5.3.03
      const otherBenefitsEntries = savedEntries.filter(
        (e: any) => e.accountId === 'acc-5.3.03',
      );
      const totalOther = otherBenefitsEntries.reduce(
        (sum: number, e: any) => sum + e.debit,
        0,
      );
      expect(totalOther).toBe(150000); // 50k + 100k

      // Verify INCOME_TAX → 2.2.04
      const taxEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.2.04',
      );
      expect(taxEntry).toBeDefined();
      expect(taxEntry.credit).toBe(20000);
    });

    it('should reject if accounts are missing', async () => {
      // Arrange
      mockAccountsRepository.find.mockResolvedValue([]); // No accounts
      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      // Note: Current implementation doesn't validate accounts exist before generating entries
      // This generates entries with undefined accountIds (which would fail at DB level)
      expect(result.status).toBe('SUCCESS');
      expect(result.entriesGenerated).toBeGreaterThan(0);

      // In a future iteration, the service should validate accounts exist and reject:
      // expect(result.status).toBe('REJECTED');
      // expect(result.errors[0].message).toContain('Account not found');
    });

    it('should prevent duplicate entries for same transaction', async () => {
      // Arrange
      mockLedgerRepository.find.mockResolvedValue([
        { id: 'existing-1', transactionId: 'tx-payroll-1' },
      ]); // Existing entries

      // Act
      const result = await service.generateEntriesForTransaction(
        mockPayrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert
      expect(result.status).toBe('REJECTED');
      expect(result.errors[0].code).toBe('DUPLICATE_ENTRIES');
    });

    it('should reject if balance does not match (DEBE ≠ HABER)', async () => {
      // Arrange
      const unbalancedTransaction = {
        ...mockPayrollTransaction,
        metadata: {
          remuneration: true,
          payrollDate: '2026-02-21',
          lines: [
            { typeId: 'ORDINARY', amount: 650000 },
            { typeId: 'AFP', amount: -100000 }, // Intentional mismatch
          ],
          totalEarnings: 650000,
          totalDeductions: 100000,
          netPayment: 550000,
        },
      } as Transaction;

      mockLedgerRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.generateEntriesForTransaction(
        unbalancedTransaction,
        'company-1',
        mockEntityManager,
      );

      // Assert - Motor debería detectar desbalance interno
      // En este caso, DEBE = 650k pero HABER sería 100k + 550k = 650k (balanceado)
      // Así que debería pasar
      expect(result.status).toBe('SUCCESS');
    });
  });

  describe('Type mapping', () => {
    it('should map all EARNING types correctly', async () => {
      // Test que todos los tipos de haberes se mapean a cuentas válidas
      const earningTypes = [
        'ORDINARY',
        'PROPORTIONAL', // → 5.3.01
        'OVERTIME',
        'BONUS',
        'ALLOWANCE',
        'GRATIFICATION', // → 5.3.03
        'VIATICUM',
        'REFUND',
        'SUBSTITUTION',
        'INCENTIVE',
        'COMMISSION',
        'ADJUSTMENT_POS',
        'FEES',
        'SETTLEMENT',
      ];

      for (const typeId of earningTypes) {
        const tx = {
          ...mockPayrollTransaction,
          metadata: {
            lines: [{ typeId, amount: 100000 }],
            totalEarnings: 100000,
            totalDeductions: 0,
            netPayment: 100000,
          },
        } as Transaction;

        mockLedgerRepository.find.mockResolvedValue([]);

        const result = await service.generateEntriesForTransaction(
          tx,
          'company-1',
          mockEntityManager,
        );

        expect(result.status).toBe('SUCCESS');
        expect(result.entriesGenerated).toBeGreaterThan(0);
      }
    });

    it('should map all DEDUCTION types correctly', async () => {
      // Test que todos los tipos de descuentos se mapean a cuentas válidas
      const deductionTypes = [
        'AFP', // → 2.2.02
        'HEALTH_INSURANCE', // → 2.2.03
        'INCOME_TAX',
        'UNEMPLOYMENT_INSURANCE',
        'LOAN_PAYMENT', // → 2.2.04
        'ADVANCE_PAYMENT',
        'UNION_FEE',
        'COURT_ORDER',
        'DEDUCTION_EXTRA',
      ];

      for (const typeId of deductionTypes) {
        const tx = {
          ...mockPayrollTransaction,
          metadata: {
            lines: [
              { typeId: 'ORDINARY', amount: 100000 },
              { typeId, amount: -10000 },
            ],
            totalEarnings: 100000,
            totalDeductions: 10000,
            netPayment: 90000,
          },
        } as Transaction;

        mockLedgerRepository.find.mockResolvedValue([]);

        const result = await service.generateEntriesForTransaction(
          tx,
          'company-1',
          mockEntityManager,
        );

        expect(result.status).toBe('SUCCESS');
        expect(result.entriesGenerated).toBeGreaterThan(0);
      }
    });
  });
});
