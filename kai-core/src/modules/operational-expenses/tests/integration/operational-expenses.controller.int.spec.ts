import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { OperationalExpensesController } from '@modules/operational-expenses/presentation/operational-expenses.controller';
import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';

describe('OperationalExpensesController (Integration)', () => {
  let app: INestApplication;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'oe-1' }),
      update: jest.fn().mockResolvedValue({ id: 'oe-1' }),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OperationalExpensesController],
      providers: [
        {
          provide: OperationalExpensesService,
          useValue: service,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject legacy metadata.attachments on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/operating-expenses')
      .send({
        companyId: '11111111-1111-4111-8111-111111111111',
        categoryId: '22222222-2222-4222-8222-222222222222',
        supplierId: '55555555-5555-4555-8555-555555555555',
        name: 'Gasto de prueba',
        referenceNumber: 'REF-1',
        operationDate: '2026-04-19',
        createdBy: '33333333-3333-4333-8333-333333333333',
        documentKind: 'SUPPLIER_INVOICE',
        fiscalAmounts: { subtotal: 10000, taxAmount: 1900, total: 11900 },
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        metadata: {
          attachments: ['/legacy/file.pdf'],
        },
      })
      .expect(400);

    expect(response.body.message).toContain(
      'metadata.attachments is no longer supported; use multimediaAssetIds instead',
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept multimediaAssetIds on create', async () => {
    await request(app.getHttpServer())
      .post('/operating-expenses')
      .send({
        companyId: '11111111-1111-4111-8111-111111111111',
        categoryId: '22222222-2222-4222-8222-222222222222',
        supplierId: '55555555-5555-4555-8555-555555555555',
        name: 'Gasto de prueba',
        referenceNumber: 'REF-1',
        operationDate: '2026-04-19',
        createdBy: '33333333-3333-4333-8333-333333333333',
        documentKind: 'SUPPLIER_INVOICE',
        fiscalAmounts: { subtotal: 10000, taxAmount: 1900, total: 11900 },
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        metadata: {
          notes: 'ok',
        },
        multimediaAssetIds: ['44444444-4444-4444-8444-444444444444'],
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: '11111111-1111-4111-8111-111111111111',
        categoryId: '22222222-2222-4222-8222-222222222222',
        supplierId: '55555555-5555-4555-8555-555555555555',
        referenceNumber: 'REF-1',
        name: 'Gasto de prueba',
        operationDate: '2026-04-19',
        createdBy: '33333333-3333-4333-8333-333333333333',
        documentKind: 'SUPPLIER_INVOICE',
        metadata: {
          notes: 'ok',
        },
        multimediaAssetIds: ['44444444-4444-4444-8444-444444444444'],
      }),
    );
  });

  it('should reject unknown query params on list', async () => {
    const response = await request(app.getHttpServer())
      .get('/operating-expenses')
      .query({ attachments: 'legacy' })
      .expect(400);

    expect(response.body.message).toContain('property attachments should not exist');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('should accept declared query params on list', async () => {
    service.findAll.mockResolvedValueOnce({ data: [], total: 0 });

    await request(app.getHttpServer())
      .get('/operating-expenses')
      .query({ limit: '25', offset: '5', companyId: '11111111-1111-4111-8111-111111111111' })
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      limit: 25,
      offset: 5,
      companyId: '11111111-1111-4111-8111-111111111111',
      branchId: undefined,
      status: undefined,
    });
  });
});