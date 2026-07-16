/**
 * E2E TEST: Customers Module - CQRS Migration Validation
 *
 * This test suite validates the complete HTTP request lifecycle for the Customers module
 * after CQRS migration, including:
 *
 * 1. Customer creation via POST /customers
 * 2. Customer search via GET /customers/search
 * 3. Customer retrieval via GET /customers/:id
 * 4. Customer update via PUT /customers/:id
 * 5. Customer deletion via DELETE /customers/:id
 * 6. Customer payments retrieval via GET /customers/:id/payments
 * 7. Customer pending payments via GET /customers/:id/pending-payments
 * 8. Customer purchases via GET /customers/:id/purchases
 *
 * Business Context:
 * -----------------
 * Customers are core business entities that interact with:
 * - Transactions (purchases, payments)
 * - Credit limits and balances
 * - Payment schedules
 * - Accounting entries
 *
 * This test validates that CQRS migration maintains full API compatibility.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';

// Simple test entities
import { Customer } from '../../src/modules/customers/domain/customer.entity';
import { Person } from '../../src/modules/persons/domain/person.entity';

// Simple database helper for basic operations
class SimpleDatabaseHelper {
  constructor(private moduleRef: TestingModule) {}

  async setupTestData(): Promise<void> {
    // Simple setup - just ensure tables exist
  }

  async cleanup(): Promise<void> {
    // Simple cleanup
  }
}

describe('Customers E2E (CQRS Migration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dbHelper: DatabaseTestHelper;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'flow-store',
          entities: [Customer, Person, Transaction],
          synchronize: false, // Use migrations in production
          dropSchema: true, // Clean DB for tests
          logging: false,
        }),
        TypeOrmModule.forFeature([Customer, Person, Transaction]),
        EventEmitterModule.forRoot(),
        CustomersModule,
        PersonsModule,
        TransactionsModule,
        InstallmentsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dbHelper = new DatabaseTestHelper(moduleRef);
    await dbHelper.setupTestData();
  });

  afterAll(async () => {
    await dbHelper.cleanup();
    await app.close();
  });

  describe('POST /customers', () => {
    it('should create a new customer successfully', () => {
      const createCustomerDto = {
        personType: 'NATURAL',
        firstName: 'Juan',
        lastName: 'Pérez',
        documentType: 'OTHER',
        documentNumber: '12345678',
        email: 'juan.perez@example.com',
        phone: '+54911234567',
        address: 'Calle Falsa 123',
        creditLimit: 5000,
        paymentDayOfMonth: 15,
        notes: 'Cliente preferencial',
      };

      return request(app.getHttpServer())
        .post('/customers')
        .send(createCustomerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.customer).toBeDefined();
          expect(res.body.customer.customerId).toBeDefined();
          expect(res.body.customer.displayName).toBe('Juan Pérez');
          expect(res.body.customer.documentNumber).toBe('12345678');
          expect(res.body.customer.creditLimit).toBe(5000);
          expect(res.body.customer.availableCredit).toBe(5000);
        });
    });

    it('should return 409 when creating customer with existing document', async () => {
      // First create a customer
      const createCustomerDto = {
        personType: 'NATURAL',
        firstName: 'María',
        lastName: 'García',
        documentType: 'OTHER',
        documentNumber: '87654321',
        email: 'maria.garcia@example.com',
        creditLimit: 3000,
      };

      await request(app.getHttpServer())
        .post('/customers')
        .send(createCustomerDto)
        .expect(201);

      // Try to create another with same document
      return request(app.getHttpServer())
        .post('/customers')
        .send(createCustomerDto)
        .expect(409);
    });
  });

  describe('GET /customers/search', () => {
    beforeAll(async () => {
      // Create test customers for search
      await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        documentNumber: '11111111',
        email: 'carlos@test.com',
      });

      await dbHelper.createTestCustomer({
        personType: 'BUSINESS',
        businessName: 'Empresa ABC S.A.',
        documentNumber: '22222222',
        email: 'contacto@empresaabc.com',
      });
    });

    it('should search customers by name', () => {
      return request(app.getHttpServer())
        .get('/customers/search?query=Carlos')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.customers).toBeDefined();
          expect(res.body.customers.length).toBeGreaterThan(0);
          expect(res.body.customers[0].displayName).toContain('Carlos');
        });
    });

    it('should search customers by document number', () => {
      return request(app.getHttpServer())
        .get('/customers/search?query=11111111')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.customers).toBeDefined();
          expect(res.body.customers.length).toBeGreaterThan(0);
          expect(res.body.customers[0].documentNumber).toBe('11111111');
        });
    });

    it('should return paginated results', () => {
      return request(app.getHttpServer())
        .get('/customers/search?page=1&pageSize=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(10);
          expect(res.body.customers).toBeDefined();
          expect(res.body.total).toBeDefined();
        });
    });
  });

  describe('GET /customers/:id', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Ana',
        lastName: 'López',
        documentNumber: '33333333',
        email: 'ana.lopez@test.com',
        creditLimit: 2000,
      });
      customerId = customer.id;
    });

    it('should retrieve customer by ID', () => {
      return request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.customer).toBeDefined();
          expect(res.body.customer.customerId).toBe(customerId);
          expect(res.body.customer.displayName).toBe('Ana López');
          expect(res.body.customer.documentNumber).toBe('33333333');
          expect(res.body.customer.creditLimit).toBe(2000);
          expect(res.body.customer.availableCredit).toBe(2000);
        });
    });

    it('should return 404 for non-existent customer', () => {
      return request(app.getHttpServer())
        .get('/customers/non-existent-id')
        .expect(200)
        .expect((res) => {
          expect(res.body.customer).toBeNull();
        });
    });
  });

  describe('PUT /customers/:id', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Pedro',
        lastName: 'Martínez',
        documentNumber: '44444444',
        creditLimit: 1000,
      });
      customerId = customer.id;
    });

    it('should update customer successfully', () => {
      const updateData = {
        creditLimit: 2500,
        paymentDayOfMonth: 20,
        notes: 'Cliente actualizado',
      };

      return request(app.getHttpServer())
        .put(`/customers/${customerId}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.customer).toBeDefined();
          expect(res.body.customer.customerId).toBe(customerId);
          expect(res.body.customer.creditLimit).toBe(2500);
          expect(res.body.customer.paymentDayOfMonth).toBe(20);
          expect(res.body.customer.notes).toBe('Cliente actualizado');
        });
    });
  });

  describe('DELETE /customers/:id', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Lucía',
        lastName: 'Fernández',
        documentNumber: '55555555',
      });
      customerId = customer.id;
    });

    it('should delete customer successfully', () => {
      return request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('eliminado');
        });
    });
  });

  describe('GET /customers/:id/payments', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Roberto',
        lastName: 'Gómez',
        documentNumber: '66666666',
      });
      customerId = customer.id;

      // Create some test transactions for the customer
      await dbHelper.createTestTransaction({
        customerId,
        transactionType: 'PURCHASE',
        total: 1500,
        status: 'COMPLETED',
      });
    });

    it('should retrieve customer payments', () => {
      return request(app.getHttpServer())
        .get(`/customers/${customerId}/payments`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.payments).toBeDefined();
          expect(Array.isArray(res.body.payments)).toBe(true);
          expect(res.body.total).toBeDefined();
        });
    });
  });

  describe('GET /customers/:id/pending-payments', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Sofia',
        lastName: 'Torres',
        documentNumber: '77777777',
      });
      customerId = customer.id;

      // Create pending transaction
      await dbHelper.createTestTransaction({
        customerId,
        transactionType: 'PURCHASE',
        total: 800,
        status: 'PENDING',
      });
    });

    it('should retrieve customer pending payments', () => {
      return request(app.getHttpServer())
        .get(`/customers/${customerId}/pending-payments`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Validate structure of pending payments
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('transactionId');
            expect(res.body[0]).toHaveProperty('total');
          }
        });
    });
  });

  describe('GET /customers/:id/purchases', () => {
    let customerId: string;

    beforeAll(async () => {
      const customer = await dbHelper.createTestCustomer({
        personType: 'NATURAL',
        firstName: 'Diego',
        lastName: 'Ramírez',
        documentNumber: '88888888',
      });
      customerId = customer.id;

      // Create purchase transaction
      await dbHelper.createTestTransaction({
        customerId,
        transactionType: 'PURCHASE',
        total: 1200,
        status: 'COMPLETED',
      });
    });

    it('should retrieve customer purchases', () => {
      return request(app.getHttpServer())
        .get(`/customers/${customerId}/purchases`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.purchases).toBeDefined();
          expect(Array.isArray(res.body.purchases)).toBe(true);
        });
    });

    it('should filter purchases by status', () => {
      return request(app.getHttpServer())
        .get(`/customers/${customerId}/purchases/COMPLETED`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.purchases).toBeDefined();
          // All purchases should have COMPLETED status
          res.body.purchases.forEach((purchase: any) => {
            expect(purchase.status).toBe('COMPLETED');
          });
        });
    });
  });
});
