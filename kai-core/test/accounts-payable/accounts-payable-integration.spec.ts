/**
 * INTEGRATION TEST: Accounts Payable - Centralized Payment Obligations
 *
 * This test suite validates the complete flow for centralizing all company payment obligations
 * (accounts payable) in the installments table, including:
 *
 * 1. Reception with payment schedule → PURCHASE transaction → Installments
 * 2. Installments endpoint returns correct data
 * 3. Installments include supplier information
 * 4. Multiple payment schedule entries create multiple installments with correct amounts
 *
 * Business Context:
 * -----------------
 * ALL company debts should be visible in one place:
 * - Purchases from suppliers (PURCHASE transactions from receptions)
 * - Employee payroll (PAYROLL transactions)
 * - Operating expenses (OPERATING_EXPENSE transactions)
 *
 * This test focuses on PHASE 1: Receptions creating installments with payment schedules.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';

// Modules
import { ReceptionsModule } from '@modules/receptions/receptions.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { InstallmentsModule } from '@modules/installments/installments.module';

// Entities
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Installment } from '@modules/installments/domain/installment.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';

// Shared
import { AccountingEngineListener } from '@shared/listeners/accounting-engine.listener';
import { CreateInstallmentsListener } from '@shared/listeners/create-installments.listener';

describe('Accounts Payable Integration (Reception → PURCHASE → Installments)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [
            Transaction,
            Installment,
            Branch,
            Company,
            Storage,
            Supplier,
            ProductVariant,
            Product,
          ],
          synchronize: true,
          dropSchema: true,
        }),
        ReceptionsModule,
        TransactionsModule,
        InstallmentsModule,
      ],
      providers: [AccountingEngineListener, CreateInstallmentsListener],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Seed minimal data for tests
    await seedTestData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Reception with payment schedule creates installments', () => {
    it('should create a reception with 3 scheduled payments and generate 3 installments', async () => {
      // Arrange: Get supplier and storage from seed
      const supplierRepo = moduleRef.get('SupplierRepository');
      const storageRepo = moduleRef.get('StorageRepository');

      const supplier = await supplierRepo.findOne({ where: {} });
      const storage = await storageRepo.findOne({ where: {} });

      expect(supplier).toBeDefined();
      expect(storage).toBeDefined();

      // Act: Create reception with payment schedule
      const receptionData = {
        type: 'direct',
        documentNumber: 'REC-2026-001',
        reference: 'FACTURA-SUPPLIER-456',
        notes: 'Reception with scheduled payments',
        supplierId: supplier.id,
        storageId: storage.id,
        lines: [
          {
            productName: 'Laptop Dell XPS 15',
            sku: 'LAPTOP-001',
            quantity: 5,
            receivedQuantity: 5,
            unitPrice: 1000000, // CLP $1,000,000 per unit
            unitCost: 900000,
          },
          {
            productName: 'Mouse Logitech MX Master',
            sku: 'MOUSE-001',
            quantity: 10,
            receivedQuantity: 10,
            unitPrice: 50000, // CLP $50,000 per unit
            unitCost: 40000,
          },
        ],
        payments: [
          {
            id: 1,
            amount: 2000000, // CLP $2,000,000
            dueDate: '2026-03-30',
          },
          {
            id: 2,
            amount: 2000000, // CLP $2,000,000
            dueDate: '2026-04-30',
          },
          {
            id: 3,
            amount: 1500000, // CLP $1,500,000
            dueDate: '2026-05-30',
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/receptions')
        .send(receptionData)
        .expect(201);

      const reception = createResponse.body;
      expect(reception).toBeDefined();
      expect(reception.id).toBeDefined();
      expect(reception.total).toBe(5500000); // 5 * 1M + 10 * 50K = 5,500,000

      // Give event listeners time to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert: Verify PURCHASE transaction was created
      const transactionsRepo = moduleRef.get('TransactionRepository');
      const transaction = await transactionsRepo.findOne({
        where: {
          metadata: {
            receptionId: reception.id,
          } as any,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.transactionType).toBe('PURCHASE');
      expect(transaction.total).toBe(5500000);
      expect(transaction.metadata).toMatchObject({
        origin: 'RECEPTION',
        receptionId: reception.id,
        numberOfInstallments: 3,
        firstDueDate: '2026-03-30',
      });
      expect(transaction.metadata.paymentSchedule).toHaveLength(3);

      // Assert: Verify 3 installments were created with correct amounts
      const installmentsRepo = moduleRef.get('InstallmentRepository');
      const installments = await installmentsRepo.find({
        where: { sourceTransactionId: transaction.id },
        order: { installmentNumber: 'ASC' },
      });

      expect(installments).toHaveLength(3);

      // Verify installment 1
      expect(installments[0]).toMatchObject({
        sourceType: 'PURCHASE',
        sourceTransactionId: transaction.id,
        payeeType: 'SUPPLIER',
        payeeId: supplier.id,
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 2000000,
        dueDate: new Date('2026-03-30'),
        status: 'PENDING',
        amountPaid: 0,
      });

      // Verify installment 2
      expect(installments[1]).toMatchObject({
        sourceType: 'PURCHASE',
        installmentNumber: 2,
        amount: 2000000,
        dueDate: new Date('2026-04-30'),
      });

      // Verify installment 3
      expect(installments[2]).toMatchObject({
        sourceType: 'PURCHASE',
        installmentNumber: 3,
        amount: 1500000,
        dueDate: new Date('2026-05-30'),
      });
    });

    it('should return installments through GET /api/installments/accounts-payable', async () => {
      // Act: Query accounts payable endpoint
      const response = await request(app.getHttpServer())
        .get('/api/installments/accounts-payable')
        .query({ status: 'PENDING,PARTIAL,OVERDUE' })
        .expect(200);

      const accountsPayable = response.body;

      // Assert: Should return array of installments
      expect(Array.isArray(accountsPayable)).toBe(true);
      expect(accountsPayable.length).toBeGreaterThan(0);

      // Verify structure of first installment
      const firstInstallment = accountsPayable[0];
      expect(firstInstallment).toHaveProperty('id');
      expect(firstInstallment).toHaveProperty('sourceType');
      expect(firstInstallment).toHaveProperty('sourceTransactionId');
      expect(firstInstallment).toHaveProperty('payeeType');
      expect(firstInstallment).toHaveProperty('payeeId');
      expect(firstInstallment).toHaveProperty('installmentNumber');
      expect(firstInstallment).toHaveProperty('totalInstallments');
      expect(firstInstallment).toHaveProperty('amount');
      expect(firstInstallment).toHaveProperty('amountPaid');
      expect(firstInstallment).toHaveProperty('pendingAmount');
      expect(firstInstallment).toHaveProperty('dueDate');
      expect(firstInstallment).toHaveProperty('status');
      expect(firstInstallment).toHaveProperty('isOverdue');
      expect(firstInstallment).toHaveProperty('daysOverdue');

      // Verify business logic
      expect(firstInstallment.sourceType).toBe('PURCHASE');
      expect(firstInstallment.payeeType).toBe('SUPPLIER');
      expect(firstInstallment.status).toBe('PENDING');
      expect(firstInstallment.amountPaid).toBe(0);
      expect(firstInstallment.pendingAmount).toBe(firstInstallment.amount);
    });

    it('should filter accounts payable by sourceType=PURCHASE', async () => {
      // Act: Query only PURCHASE obligations
      const response = await request(app.getHttpServer())
        .get('/api/installments/accounts-payable')
        .query({ sourceType: 'PURCHASE' })
        .expect(200);

      const accountsPayable = response.body;

      // Assert: All returned installments should be PURCHASE type
      expect(Array.isArray(accountsPayable)).toBe(true);
      accountsPayable.forEach((item: any) => {
        expect(item.sourceType).toBe('PURCHASE');
      });
    });

    it('should exclude SALE installments (accounts receivable) by default', async () => {
      // Note: This test assumes there might be SALE installments in the database
      // Accounts payable should NOT include SALE (those are accounts receivable)

      // Act: Query accounts payable without filters
      const response = await request(app.getHttpServer())
        .get('/api/installments/accounts-payable')
        .expect(200);

      const accountsPayable = response.body;

      // Assert: Should NOT contain any SALE installments
      const saleInstallments = accountsPayable.filter(
        (item: any) => item.sourceType === 'SALE',
      );
      expect(saleInstallments).toHaveLength(0);
    });
  });

  describe('Reception without payment schedule', () => {
    it('should NOT create installments if no payments array provided', async () => {
      // Arrange
      const supplierRepo = moduleRef.get('SupplierRepository');
      const storageRepo = moduleRef.get('StorageRepository');

      const supplier = await supplierRepo.findOne({ where: {} });
      const storage = await storageRepo.findOne({ where: {} });

      // Act: Create reception WITHOUT payments
      const receptionData = {
        type: 'direct',
        documentNumber: 'REC-NO-PAYMENTS',
        supplierId: supplier.id,
        storageId: storage.id,
        lines: [
          {
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 1,
            receivedQuantity: 1,
            unitPrice: 100000,
            unitCost: 90000,
          },
        ],
        // NO payments array
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/receptions')
        .send(receptionData)
        .expect(201);

      const reception = createResponse.body;

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert: Transaction created but NO installments
      const transactionsRepo = moduleRef.get('TransactionRepository');
      const transaction = await transactionsRepo.findOne({
        where: {
          metadata: {
            receptionId: reception.id,
          } as any,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.metadata.numberOfInstallments).toBeUndefined();

      const installmentsRepo = moduleRef.get('InstallmentRepository');
      const installments = await installmentsRepo.find({
        where: { sourceTransactionId: transaction.id },
      });

      expect(installments).toHaveLength(0);
    });
  });
});

/**
 * Seed minimal test data
 */
async function seedTestData(app: INestApplication) {
  const companyRepo = app.get('CompanyRepository');
  const branchRepo = app.get('BranchRepository');
  const storageRepo = app.get('StorageRepository');
  const supplierRepo = app.get('SupplierRepository');

  // Create company
  const company = companyRepo.create({
    id: 'company-test-1',
    razonSocial: 'Test Company',
    rut: '11.111.111-1',
  });
  await companyRepo.save(company);

  // Create branch
  const branch = branchRepo.create({
    id: 'branch-test-1',
    name: 'Main Branch',
    companyId: company.id,
  });
  await branchRepo.save(branch);

  // Create storage
  const storage = storageRepo.create({
    id: 'storage-test-1',
    name: 'Main Warehouse',
    branchId: branch.id,
  });
  await storageRepo.save(storage);

  // Create supplier
  const supplier = supplierRepo.create({
    id: 'supplier-test-1',
    name: 'Test Supplier Inc.',
    taxId: '98765432-1',
  });
  await supplierRepo.save(supplier);
}
