import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ReceptionsController } from '@modules/receptions/presentation/receptions.controller';
import { ReceptionsService } from '@modules/receptions/application/receptions.service';
import { ReceptionVoidService } from '@modules/receptions/application/reception-void.service';

describe('ReceptionsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    search: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    createDirect: jest.Mock;
    createFromPurchaseOrder: jest.Mock;
  };

  let voidService: { void: jest.Mock };

  beforeEach(async () => {
    voidService = {
      void: jest.fn().mockResolvedValue({
        reception: { id: 'rec-1', status: 'VOIDED' },
      }),
    };
    service = {
      search: jest.fn(),
      getById: jest.fn(),
      create: jest.fn().mockResolvedValue({ success: true }),
      createDirect: jest.fn().mockResolvedValue({ success: true }),
      createFromPurchaseOrder: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReceptionsController],
      providers: [
        {
          provide: ReceptionsService,
          useValue: service,
        },
        {
          provide: ReceptionVoidService,
          useValue: voidService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Simula lo que resuelve TenantGuard en producción.
    app.use((req: any, _res: any, next: () => void) => {
      req.activeCompanyId = 'co-1';
      req.currentUser = { id: 'user-1', userName: 'tester', rol: 'ADMIN', companyId: 'co-1' };
      next();
    });
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

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/receptions')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        imagePath: '/legacy/reception.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept declared fields on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        lines: [
          {
            quantity: 2,
            unitPrice: 100,
          },
        ],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        lines: [
          expect.objectContaining({
            quantity: 2,
            unitPrice: 100,
          }),
        ],
      }),
    );
  });

  it('should accept reference and documentType on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        reference: 'FOLIO-999',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'FOLIO-999',
        documentType: 'invoice',
      }),
    );
  });

  it('should accept supplierDocumentPayment and supplierFiscalAmounts on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        supplierFiscalAmounts: {
          subtotalNeto: 10,
          taxAmount: 0,
          total: 10,
          taxId: null,
          taxRatePct: 0,
        },
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierDocumentPayment: expect.objectContaining({ mode: 'PENDING' }),
        supplierFiscalAmounts: expect.objectContaining({ total: 10 }),
      }),
    );
  });

  it('should reject invalid documentType on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'not-a-dte',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(400);

    expect(service.createDirect).not.toHaveBeenCalled();
  });

  it('should accept cashSessionId and pointOfSaleId on createDirect (POS)', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        cashSessionId: '33333333-3333-4333-8333-333333333333',
        pointOfSaleId: '44444444-4444-4444-8444-444444444444',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
        supplierDocumentPayment: {
          mode: 'COMPLETED',
          paidLines: [
            {
              dueDate: '2026-05-18',
              amount: 10,
              paymentMethod: 'CASH',
            },
          ],
          scheduledLines: [],
        },
        supplierFiscalAmounts: {
          subtotalNeto: 10,
          taxAmount: 0,
          total: 10,
          taxId: null,
          taxRatePct: 0,
        },
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        cashSessionId: '33333333-3333-4333-8333-333333333333',
        pointOfSaleId: '44444444-4444-4444-8444-444444444444',
      }),
    );
  });

  it('should accept CASH paidLine with cashHubId even when top-level cashSessionId is present', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        cashSessionId: '33333333-3333-4333-8333-333333333333',
        pointOfSaleId: '44444444-4444-4444-8444-444444444444',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
        supplierDocumentPayment: {
          mode: 'COMPLETED',
          paidLines: [
            {
              dueDate: '2026-05-18',
              amount: 10,
              paymentMethod: 'CASH',
              cashHubId: '55555555-5555-4555-8555-555555555555',
            },
          ],
          scheduledLines: [],
        },
        supplierFiscalAmounts: {
          subtotalNeto: 10,
          taxAmount: 0,
          total: 10,
          taxId: null,
          taxRatePct: 0,
        },
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        cashSessionId: '33333333-3333-4333-8333-333333333333',
        supplierDocumentPayment: expect.objectContaining({
          paidLines: [
            expect.objectContaining({
              paymentMethod: 'CASH',
              cashHubId: '55555555-5555-4555-8555-555555555555',
            }),
          ],
        }),
      }),
    );
  });

  it('should accept documentType other on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'other',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'other',
      }),
    );
  });

  describe('POST /receptions/:id/void', () => {
    it('anula con motivo y delega con compañía y usuario del contexto', async () => {
      const response = await request(app.getHttpServer())
        .post('/receptions/rec-1/void')
        .send({ reason: 'Factura mal ingresada' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        reception: { id: 'rec-1', status: 'VOIDED' },
      });
      expect(voidService.void).toHaveBeenCalledWith(
        'co-1',
        'user-1',
        'rec-1',
        expect.objectContaining({ reason: 'Factura mal ingresada' }),
      );
    });

    it('rechaza motivo de menos de 3 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/receptions/rec-1/void')
        .send({ reason: 'ab' })
        .expect(400);
      expect(voidService.void).not.toHaveBeenCalled();
    });

    it('rechaza body sin motivo y campos desconocidos', async () => {
      await request(app.getHttpServer())
        .post('/receptions/rec-1/void')
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .post('/receptions/rec-1/void')
        .send({ reason: 'motivo válido', foo: 1 })
        .expect(400);
      expect(voidService.void).not.toHaveBeenCalled();
    });

    it('acepta acknowledgePmpNotRestored', async () => {
      await request(app.getHttpServer())
        .post('/receptions/rec-1/void')
        .send({ reason: 'motivo válido', acknowledgePmpNotRestored: true })
        .expect(201);
      expect(voidService.void).toHaveBeenCalledWith(
        'co-1',
        'user-1',
        'rec-1',
        expect.objectContaining({ acknowledgePmpNotRestored: true }),
      );
    });
  });
});
