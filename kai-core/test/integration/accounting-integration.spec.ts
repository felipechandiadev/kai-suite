/**
 * INTEGRATION TESTS - Motor Contable
 *
 * Estos tests validan el flujo completo end-to-end:
 * Transaction → AccountingEngineListener → LedgerEntriesService → LedgerEntry
 *
 * Cada test documenta la transacción y los asientos esperados en formato tabla.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import {
  AccountingAccount,
  AccountType,
} from '@modules/accounting-accounts/domain/accounting-account.entity';
import {
  AccountingRule,
  RuleScope,
} from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Employee } from '@modules/employees/domain/employee.entity';

/**
 * Helper: Crear asiento esperado
 */
interface ExpectedEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

describe('Accounting Integration Tests - Motor Contable E2E', () => {
  let service: LedgerEntriesService;
  let accountsRepository: Repository<AccountingAccount>;
  let rulesRepository: Repository<AccountingRule>;
  let ledgerRepository: Repository<LedgerEntry>;

  // Mock repositories
  const mockLedgerRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ balance: 2000000 }), // Mock balance suficiente para pagos
    })),
  };

  const mockAccountsRepository = {
    find: jest.fn(),
  };

  const mockRulesRepository = {
    find: jest.fn(),
  };

  const mockCustomerRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockSupplierRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockShareholderRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockEmployeeRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockEntityManager = {
    getRepository: jest.fn(),
  } as unknown as EntityManager;

  // Plan de cuentas mock - Cuentas reales del sistema
  const mockAccounts: AccountingAccount[] = [
    // ACTIVOS
    {
      id: 'acc-1.1.01',
      code: '1.1.01',
      name: 'Caja',
      type: AccountType.ASSET,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-1.1.02',
      code: '1.1.02',
      name: 'Banco',
      type: AccountType.ASSET,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-1.2.01',
      code: '1.2.01',
      name: 'Cuentas por cobrar clientes',
      type: AccountType.ASSET,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'acc-1.3.01',
      code: '1.3.01',
      name: 'Inventario de mercaderías',
      type: AccountType.ASSET,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // PASIVOS
    {
      id: 'acc-2.1.01',
      code: '2.1.01',
      name: 'Cuentas por pagar proveedores',
      type: AccountType.LIABILITY,
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

    // INGRESOS
    {
      id: 'acc-4.1.01',
      code: '4.1.01',
      name: 'Ventas',
      type: AccountType.INCOME,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // GASTOS
    {
      id: 'acc-5.1.01',
      code: '5.1.01',
      name: 'Costo de ventas',
      type: AccountType.EXPENSE,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
      id: 'acc-5.4.01',
      code: '5.4.01',
      name: 'Gastos operacionales',
      type: AccountType.EXPENSE,
      companyId: 'company-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as AccountingAccount[];

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
    rulesRepository = module.get(getRepositoryToken(AccountingRule));

    jest.clearAllMocks();

    // Setup default mocks
    mockAccountsRepository.find.mockResolvedValue(mockAccounts);
    mockRulesRepository.find.mockResolvedValue([]);
    mockLedgerRepository.find.mockResolvedValue([]);
    (mockEntityManager.getRepository as jest.Mock).mockReturnValue({
      create: jest.fn((dto) => ({ ...dto, id: `ledger-${Math.random()}` })),
      save: jest
        .fn()
        .mockImplementation((entities) => Promise.resolve(entities)),
    });
  });

  /**
   * ========================================================================
   * TEST 1: REMUNERACIÓN (PAYROLL)
   * ========================================================================
   *
   * Escenario: Pago de planilla con sueldos y descuentos
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 5.3.01  │ Sueldos y salarios           │ 1,000,000  │            │
   * │ 2.2.02  │ AFP por pagar                │            │   100,000  │
   * │ 2.2.03  │ Salud por pagar              │            │    70,000  │
   * │ 2.2.01  │ Remuneraciones por pagar     │            │   830,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   *           TOTALES:                         1,000,000     1,000,000
   *
   * Explicación:
   * - DEBE 5.3.01: Reconocemos el gasto de sueldos           │ 1,000,000
   * - HABER 2.2.02: Retenemos AFP a pagar                     │   100,000
   * - HABER 2.2.03: Retenemos salud a pagar                   │    70,000
   * - HABER 2.2.01: Líquido a pagar al empleado               │   830,000
   */
  describe('1. REMUNERACIÓN (PAYROLL)', () => {
    it('debe generar asientos contables correctos para remuneración', async () => {
      // ARRANGE: Crear transacción de remuneración
      const payrollTransaction: Transaction = {
        id: 'tx-payroll-001',
        documentNumber: 'REM-2026-001',
        transactionType: TransactionType.PAYROLL,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        employeeId: 'emp-001',
        total: 830000, // Líquido a pagar
        subtotal: 1000000, // Sueldo bruto
        taxAmount: 0,
        discountAmount: 170000, // AFP + Salud
        paymentMethod: PaymentMethod.TRANSFER,
        amountPaid: 0,
        createdAt: new Date('2026-02-21'),
        lines: [],
        metadata: {
          remuneration: true,
          payrollDate: '2026-02-21',
          lines: [
            { typeId: 'ORDINARY', amount: 1000000 }, // Sueldo base
            { typeId: 'AFP', amount: -100000 }, // Descuento AFP
            { typeId: 'HEALTH_INSURANCE', amount: -70000 }, // Descuento Salud
          ],
          totalEarnings: 1000000,
          totalDeductions: 170000,
          netPayment: 830000,
        },
      } as unknown as Transaction;

      // ACT: Generar asientos
      const result = await service.generateEntriesForTransaction(
        payrollTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT: Verificar éxito
      expect(result.status).toBe('SUCCESS');
      expect(result.entriesGenerated).toBe(4);
      expect(result.balanceValidated).toBe(true);

      // Obtener asientos generados
      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Tabla de verificación
      const expectedEntries: ExpectedEntry[] = [
        {
          accountCode: '5.3.01',
          accountName: 'Sueldos y salarios',
          debit: 1000000,
          credit: 0,
        },
        {
          accountCode: '2.2.02',
          accountName: 'AFP por pagar',
          debit: 0,
          credit: 100000,
        },
        {
          accountCode: '2.2.03',
          accountName: 'Salud por pagar',
          debit: 0,
          credit: 70000,
        },
        {
          accountCode: '2.2.01',
          accountName: 'Remuneraciones por pagar',
          debit: 0,
          credit: 830000,
        },
      ];

      // Verificar cada asiento
      expect(savedEntries).toHaveLength(4);

      const sueldosEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-5.3.01',
      );
      expect(sueldosEntry).toBeDefined();
      expect(sueldosEntry.debit).toBe(1000000);
      expect(sueldosEntry.credit).toBe(0);

      const afpEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.2.02',
      );
      expect(afpEntry).toBeDefined();
      expect(afpEntry.debit).toBe(0);
      expect(afpEntry.credit).toBe(100000);

      const saludEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.2.03',
      );
      expect(saludEntry).toBeDefined();
      expect(saludEntry.debit).toBe(0);
      expect(saludEntry.credit).toBe(70000);

      const remuneracionesEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.2.01',
      );
      expect(remuneracionesEntry).toBeDefined();
      expect(remuneracionesEntry.debit).toBe(0);
      expect(remuneracionesEntry.credit).toBe(830000);

      // Verificar balance
      const totalDebit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.debit || 0),
        0,
      );
      const totalCredit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.credit || 0),
        0,
      );
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(1000000);

      // Log tabla para documentación
      console.log(
        '\n┌─────────┬──────────────────────────────┬────────────┬────────────┐',
      );
      console.log(
        '│ Cuenta  │ Descripción                  │ DEBE       │ HABER      │',
      );
      console.log(
        '├─────────┼──────────────────────────────┼────────────┼────────────┤',
      );
      savedEntries.forEach((entry: any) => {
        const account = mockAccounts.find((a) => a.id === entry.accountId);
        const debe = entry.debit.toLocaleString('es-CL').padStart(10);
        const haber = entry.credit.toLocaleString('es-CL').padStart(10);
        console.log(
          `│ ${account?.code} │ ${account?.name.padEnd(28)} │ ${debe} │ ${haber} │`,
        );
      });
      console.log(
        '└─────────┴──────────────────────────────┴────────────┴────────────┘',
      );
      console.log(
        `          TOTALES:                         ${totalDebit.toLocaleString('es-CL').padStart(10)}   ${totalCredit.toLocaleString('es-CL').padStart(10)}\n`,
      );
    });
  });

  /**
   * ========================================================================
   * TEST 2: VENTA AL CONTADO (SALE - CASH)
   * ========================================================================
   *
   * Escenario: Venta de mercadería con pago en efectivo
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 1.1.01  │ Caja                         │   500,000  │            │
   * │ 4.1.01  │ Ventas                       │            │   500,000  │
   * │ 5.1.01  │ Costo de ventas              │   300,000  │            │
   * │ 1.3.01  │ Inventario de mercaderías    │            │   300,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   *           TOTALES:                           800,000       800,000
   */
  describe('2. VENTA AL CONTADO (SALE - CASH)', () => {
    it('debe generar asientos para venta al contado con costo de venta', async () => {
      // ARRANGE: Reglas contables para ventas al contado
      const saleRules: AccountingRule[] = [
        {
          id: 'rule-sale-cash-1',
          companyId: 'company-1',
          transactionType: TransactionType.SALE,
          paymentMethod: PaymentMethod.CASH,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-1.1.01', // Caja
          creditAccountId: 'acc-4.1.01', // Ventas
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
        {
          id: 'rule-sale-cash-2',
          companyId: 'company-1',
          transactionType: TransactionType.SALE,
          appliesTo: RuleScope.TRANSACTION_LINE,
          debitAccountId: 'acc-5.1.01', // Costo de ventas
          creditAccountId: 'acc-1.3.01', // Inventario
          priority: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(saleRules);

      const saleTransaction: Transaction = {
        id: 'tx-sale-001',
        documentNumber: 'VENTA-001',
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        customerId: 'customer-1',
        total: 500000,
        subtotal: 500000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 500000,
        createdAt: new Date('2026-02-21'),
        lines: [],
        metadata: {
          costOfGoods: 300000, // Costo de las mercaderías vendidas
        },
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        saleTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');
      expect(result.balanceValidated).toBe(true);

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      // Verificar asientos
      const cajaEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.1.01',
      );
      expect(cajaEntry?.debit).toBe(500000);

      const ventasEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-4.1.01',
      );
      expect(ventasEntry?.credit).toBe(500000);

      // Balance
      const totalDebit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.debit || 0),
        0,
      );
      const totalCredit = savedEntries.reduce(
        (sum: number, e: any) => sum + (e.credit || 0),
        0,
      );
      expect(totalDebit).toBe(totalCredit);
    });
  });

  /**
   * ========================================================================
   * TEST 3: VENTA A CRÉDITO (SALE - CREDIT)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 1.2.01  │ Cuentas por cobrar clientes  │   750,000  │            │
   * │ 4.1.01  │ Ventas                       │            │   750,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   */
  describe('3. VENTA A CRÉDITO (SALE - CREDIT)', () => {
    it('debe generar asiento con CxC cuando venta es a crédito', async () => {
      const creditSaleRules: AccountingRule[] = [
        {
          id: 'rule-sale-credit',
          companyId: 'company-1',
          transactionType: TransactionType.SALE,
          paymentMethod: PaymentMethod.CREDIT,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-1.2.01', // CxC
          creditAccountId: 'acc-4.1.01', // Ventas
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(creditSaleRules);

      const creditSaleTransaction: Transaction = {
        id: 'tx-sale-credit-001',
        documentNumber: 'VCRED-001',
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        customerId: 'customer-1',
        total: 750000,
        subtotal: 750000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CREDIT,
        amountPaid: 0,
        createdAt: new Date('2026-02-21'),
        lines: [],
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        creditSaleTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const cxcEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.2.01',
      );
      expect(cxcEntry?.debit).toBe(750000);

      const ventasEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-4.1.01',
      );
      expect(ventasEntry?.credit).toBe(750000);
    });
  });

  /**
   * ========================================================================
   * TEST 4: COMPRA DE MERCADERÍA (PURCHASE)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 1.3.01  │ Inventario de mercaderías    │   2,000,000│            │
   * │ 2.1.01  │ Cuentas por pagar proveedores│            │ 2,000,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   */
  describe('4. COMPRA DE MERCADERÍA (PURCHASE)', () => {
    it('debe generar asientos para compra a crédito', async () => {
      const purchaseRules: AccountingRule[] = [
        {
          id: 'rule-purchase',
          companyId: 'company-1',
          transactionType: TransactionType.PURCHASE,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-1.3.01', // Inventario
          creditAccountId: 'acc-2.1.01', // CxP Proveedores
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(purchaseRules);

      const purchaseTransaction: Transaction = {
        id: 'tx-purchase-001',
        documentNumber: 'COMP-001',
        transactionType: TransactionType.PURCHASE,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        total: 2000000,
        subtotal: 2000000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CREDIT,
        amountPaid: 0,
        createdAt: new Date('2026-02-21'),
        lines: [],
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        purchaseTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const inventarioEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.3.01',
      );
      expect(inventarioEntry?.debit).toBe(2000000);

      const cxpEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.1.01',
      );
      expect(cxpEntry?.credit).toBe(2000000);
    });
  });

  /**
   * ========================================================================
   * TEST 5: PAGO A PROVEEDOR (SUPPLIER_PAYMENT)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 2.1.01  │ Cuentas por pagar proveedores│   1,500,000│            │
   * │ 1.1.02  │ Banco                        │            │ 1,500,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   */
  describe('5. PAGO A PROVEEDOR (SUPPLIER_PAYMENT)', () => {
    it('debe generar asientos para pago a proveedor por transferencia', async () => {
      const paymentOutRules: AccountingRule[] = [
        {
          id: 'rule-payment-out',
          companyId: 'company-1',
          transactionType: TransactionType.SUPPLIER_PAYMENT,
          paymentMethod: PaymentMethod.TRANSFER,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-2.1.01', // CxP Proveedores (reducimos deuda)
          creditAccountId: 'acc-1.1.02', // Banco (sale dinero)
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(paymentOutRules);

      const paymentOutTransaction: Transaction = {
        id: 'tx-payment-out-001',
        documentNumber: 'PAGO-001',
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        total: 1500000,
        subtotal: 1500000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.TRANSFER,
        amountPaid: 1500000,
        createdAt: new Date('2026-02-21'),
        lines: [],
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        paymentOutTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const cxpEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.1.01',
      );
      expect(cxpEntry?.debit).toBe(1500000);

      const bancoEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.1.02',
      );
      expect(bancoEntry?.credit).toBe(1500000);
    });
  });

  /**
   * ========================================================================
   * TEST 6: COBRO A CLIENTE (PAYMENT_IN)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 1.1.01  │ Caja                         │   500,000  │            │
   * │ 1.2.01  │ Cuentas por cobrar clientes  │            │   500,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   */
  describe('6. COBRO A CLIENTE (PAYMENT_IN)', () => {
    it('debe generar asientos para cobro en efectivo', async () => {
      const paymentInRules: AccountingRule[] = [
        {
          id: 'rule-payment-in',
          companyId: 'company-1',
          transactionType: TransactionType.PAYMENT_IN,
          paymentMethod: PaymentMethod.CASH,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-1.1.01', // Caja (entra dinero)
          creditAccountId: 'acc-1.2.01', // CxC (reducimos deuda del cliente)
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(paymentInRules);

      const paymentInTransaction: Transaction = {
        id: 'tx-payment-in-001',
        documentNumber: 'COBRO-001',
        transactionType: TransactionType.PAYMENT_IN,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        customerId: 'customer-1',
        total: 500000,
        subtotal: 500000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 500000,
        createdAt: new Date('2026-02-21'),
        lines: [],
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        paymentInTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const cajaEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.1.01',
      );
      expect(cajaEntry?.debit).toBe(500000);

      const cxcEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.2.01',
      );
      expect(cxcEntry?.credit).toBe(500000);
    });
  });

  /**
   * ========================================================================
   * TEST 7: GASTO OPERATIVO (OPERATING_EXPENSE)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 5.4.01  │ Gastos operacionales         │   150,000  │            │
   * │ 1.1.01  │ Caja                         │            │   150,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   */
  describe('7. GASTO OPERATIVO (OPERATING_EXPENSE)', () => {
    it('debe generar asientos para gasto pagado en efectivo', async () => {
      const expenseRules: AccountingRule[] = [
        {
          id: 'rule-expense',
          companyId: 'company-1',
          transactionType: TransactionType.OPERATING_EXPENSE,
          paymentMethod: PaymentMethod.CASH,
          appliesTo: RuleScope.TRANSACTION,
          debitAccountId: 'acc-5.4.01', // Gastos operacionales
          creditAccountId: 'acc-1.1.01', // Caja
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(expenseRules);

      const expenseTransaction: Transaction = {
        id: 'tx-expense-001',
        documentNumber: 'GASTO-001',
        transactionType: TransactionType.OPERATING_EXPENSE,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        total: 150000,
        subtotal: 150000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 150000,
        createdAt: new Date('2026-02-21'),
        lines: [],
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        expenseTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const gastoEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-5.4.01',
      );
      expect(gastoEntry?.debit).toBe(150000);

      const cajaEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.1.01',
      );
      expect(cajaEntry?.credit).toBe(150000);
    });
  });

  /**
   * ========================================================================
   * TEST 8: PAGO DE REMUNERACIÓN (PAYROLL_PAYMENT)
   * ========================================================================
   *
   * TABLA DE ASIENTOS ESPERADOS:
   * ┌─────────┬──────────────────────────────┬────────────┬────────────┐
   * │ Cuenta  │ Descripción                  │ DEBE       │ HABER      │
   * ├─────────┼──────────────────────────────┼────────────┼────────────┤
   * │ 2.2.01  │ Remuneraciones por pagar     │   830,000  │            │
   * │ 1.1.02  │ Banco                        │            │   830,000  │
   * └─────────┴──────────────────────────────┴────────────┴────────────┘
   *
   * Nota: Este asiento se genera cuando se PAGA la remuneración previamente
   * registrada. El gasto ya fue reconocido en el asiento de PAYROLL.
   */
  describe('8. PAGO DE REMUNERACIÓN (PAYROLL_PAYMENT)', () => {
    it('debe generar asientos para pago de remuneración por banco', async () => {
      const payrollPaymentRules: AccountingRule[] = [
        {
          id: 'rule-payroll-payment',
          companyId: 'company-1',
          transactionType: TransactionType.PAYROLL_PAYMENT,
          creditAccountId: 'acc-1.1.02', // Banco
          priority: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as AccountingRule,
      ];

      mockRulesRepository.find.mockResolvedValue(payrollPaymentRules);

      const payrollPaymentTransaction: Transaction = {
        id: 'tx-payroll-payment-001',
        documentNumber: 'PAGO-REM-001',
        transactionType: TransactionType.PAYROLL_PAYMENT,
        status: TransactionStatus.CONFIRMED,
        branchId: 'branch-1',
        userId: 'user-1',
        employeeId: 'emp-001',
        companyId: 'company-1',
        total: 830000,
        subtotal: 830000,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: PaymentMethod.TRANSFER,
        amountPaid: 830000,
        createdAt: new Date('2026-02-21'),
        lines: [],
        metadata: {
          relatedPayrollId: 'tx-payroll-001',
        },
      } as unknown as Transaction;

      // ACT
      const result = await service.generateEntriesForTransaction(
        payrollPaymentTransaction,
        'company-1',
        mockEntityManager,
      );

      // ASSERT
      expect(result.status).toBe('SUCCESS');

      const saveRepo = (mockEntityManager.getRepository as jest.Mock).mock
        .results[0].value;
      const savedEntries = saveRepo.save.mock.calls[0][0];

      const remuneracionesEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-2.2.01',
      );
      expect(remuneracionesEntry?.debit).toBe(830000);

      const bancoEntry = savedEntries.find(
        (e: any) => e.accountId === 'acc-1.1.02',
      );
      expect(bancoEntry?.credit).toBe(830000);
    });
  });
});
