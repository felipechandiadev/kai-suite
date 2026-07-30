/**
 * E2E TEST: Suppliers Module - CQRS Migration Validation
 *
 * This test suite validates the complete HTTP request lifecycle for the Suppliers module
 * after CQRS migration, including:
 *
 * 1. Supplier creation via POST /suppliers
 * 2. Supplier listing via GET /suppliers
 * 3. Supplier retrieval via GET /suppliers/:id
 * 4. Supplier update via PUT /suppliers/:id
 * 5. Supplier deletion via DELETE /suppliers/:id
 *
 * Business Context:
 * -----------------
 * Suppliers are business entities that provide goods/services to the company.
 * They interact with:
 * - Purchase transactions
 * - Payment terms and schedules
 * - Accounting entries
 * - Inventory management
 *
 * This test validates that CQRS migration maintains full API compatibility.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';

// Modules
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { PersonsModule } from '@modules/persons/persons.module';

// Entities
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Person } from '@modules/persons/domain/person.entity';

// Shared
import { DatabaseTestHelper } from '@shared/test/database-test.helper';

describe('Suppliers E2E (CQRS Migration)', () => {
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
          entities: [Supplier, Person],
          synchronize: false, // Use migrations in production
          dropSchema: true, // Clean DB for tests
          logging: false,
        }),
        EventEmitterModule.forRoot(),
        SuppliersModule,
        PersonsModule,
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

  describe('GET /suppliers', () => {
    beforeAll(async () => {
      // Create test suppliers
      await dbHelper.createTestSupplier({
        personId: 'person-1',
        supplierType: 'LOCAL',
        defaultPaymentTermDays: 30,
        alias: 'Proveedor Local ABC',
        notes: 'Proveedor confiable',
      });

      await dbHelper.createTestSupplier({
        personId: 'person-2',
        supplierType: 'INTERNATIONAL',
        defaultPaymentTermDays: 60,
        alias: 'Importadora XYZ',
        notes: 'Proveedor internacional',
      });
    });

    it('should list all suppliers', () => {
      return request(app.getHttpServer())
        .get('/suppliers')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.total).toBeDefined();
          expect(typeof res.body.total).toBe('number');
        });
    });

    it('should filter suppliers by active status', () => {
      return request(app.getHttpServer())
        .get('/suppliers?isActive=true')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          // All returned suppliers should be active
          res.body.data.forEach((supplier: any) => {
            expect(supplier.isActive).toBe(true);
          });
        });
    });

    it('should filter suppliers by type', () => {
      return request(app.getHttpServer())
        .get('/suppliers?supplierType=LOCAL')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          // All returned suppliers should be LOCAL type
          res.body.data.forEach((supplier: any) => {
            expect(supplier.supplierType).toBe('LOCAL');
          });
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/suppliers?limit=10&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(10);
          expect(res.body.total).toBeDefined();
        });
    });
  });

  describe('GET /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const supplier = await dbHelper.createTestSupplier({
        personId: 'person-3',
        supplierType: 'LOCAL',
        defaultPaymentTermDays: 45,
        alias: 'Proveedor de Prueba',
        notes: 'Para testing',
      });
      supplierId = supplier.id;
    });

    it('should retrieve supplier by ID', () => {
      return request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.id).toBe(supplierId);
          expect(res.body.supplierType).toBe('LOCAL');
          expect(res.body.defaultPaymentTermDays).toBe(45);
          expect(res.body.alias).toBe('Proveedor de Prueba');
          expect(res.body.notes).toBe('Para testing');
        });
    });

    it('should return 404 for non-existent supplier', () => {
      return request(app.getHttpServer())
        .get('/suppliers/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /suppliers', () => {
    it('should create a new supplier successfully', () => {
      const createSupplierDto = {
        personId: 'person-4',
        supplierType: 'INTERNATIONAL',
        defaultPaymentTermDays: 90,
        alias: 'Nuevo Proveedor Internacional',
        notes: 'Proveedor recién agregado',
      };

      return request(app.getHttpServer())
        .post('/suppliers')
        .send(createSupplierDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.id).toBeDefined();
          expect(res.body.supplierType).toBe('INTERNATIONAL');
          expect(res.body.defaultPaymentTermDays).toBe(90);
          expect(res.body.alias).toBe('Nuevo Proveedor Internacional');
          expect(res.body.notes).toBe('Proveedor recién agregado');
          expect(res.body.isActive).toBe(true);
        });
    });

    it('should create supplier with minimal data', () => {
      const minimalDto = {
        personId: 'person-5',
        supplierType: 'LOCAL',
        defaultPaymentTermDays: 30,
      };

      return request(app.getHttpServer())
        .post('/suppliers')
        .send(minimalDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.id).toBeDefined();
          expect(res.body.supplierType).toBe('LOCAL');
          expect(res.body.defaultPaymentTermDays).toBe(30);
          expect(res.body.alias).toBeUndefined();
          expect(res.body.notes).toBeUndefined();
        });
    });
  });

  describe('PUT /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const supplier = await dbHelper.createTestSupplier({
        personId: 'person-6',
        supplierType: 'LOCAL',
        defaultPaymentTermDays: 30,
        alias: 'Proveedor Original',
        notes: 'Notas originales',
      });
      supplierId = supplier.id;
    });

    it('should update supplier successfully', () => {
      const updateData = {
        supplierType: 'INTERNATIONAL',
        defaultPaymentTermDays: 120,
        alias: 'Proveedor Actualizado',
        notes: 'Notas actualizadas',
        isActive: true,
      };

      return request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.id).toBe(supplierId);
          expect(res.body.supplierType).toBe('INTERNATIONAL');
          expect(res.body.defaultPaymentTermDays).toBe(120);
          expect(res.body.alias).toBe('Proveedor Actualizado');
          expect(res.body.notes).toBe('Notas actualizadas');
          expect(res.body.isActive).toBe(true);
        });
    });

    it('should update only provided fields', () => {
      const partialUpdate = {
        alias: 'Alias Modificado',
      };

      return request(app.getHttpServer())
        .put(`/suppliers/${supplierId}`)
        .send(partialUpdate)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.alias).toBe('Alias Modificado');
          // Other fields should remain unchanged
          expect(res.body.supplierType).toBe('INTERNATIONAL');
          expect(res.body.defaultPaymentTermDays).toBe(120);
        });
    });

    it('should return 404 when updating non-existent supplier', () => {
      const updateData = {
        alias: 'Nuevo Alias',
      };

      return request(app.getHttpServer())
        .put('/suppliers/non-existent-id')
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const supplier = await dbHelper.createTestSupplier({
        personId: 'person-7',
        supplierType: 'LOCAL',
        defaultPaymentTermDays: 15,
        alias: 'Proveedor a Eliminar',
      });
      supplierId = supplier.id;
    });

    it('should delete supplier successfully', () => {
      return request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .expect(200);
    });

    it('should return 404 when deleting non-existent supplier', () => {
      return request(app.getHttpServer())
        .delete('/suppliers/non-existent-id')
        .expect(404);
    });

    it('should return 404 when retrieving deleted supplier', () => {
      return request(app.getHttpServer())
        .get(`/suppliers/${supplierId}`)
        .expect(404);
    });
  });
});
