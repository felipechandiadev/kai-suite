import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SupplierPaymentsController } from '@modules/transactions/presentation/supplier-payments.controller';

describe('SupplierPaymentsController (Integration)', () => {
  let app: INestApplication;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    };
    queryBus = {
      execute: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentsController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: QueryBus,
          useValue: queryBus,
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

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/supplier-payments')
      .send({
        branchId: '11111111-1111-4111-8111-111111111111',
        userId: '22222222-2222-4222-8222-222222222222',
        total: 100,
        imagePath: '/legacy/payment.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('should reject unknown fields on complete', async () => {
    const response = await request(app.getHttpServer())
      .post('/supplier-payments/tx-1/complete')
      .send({
        note: 'ok',
        imagePath: '/legacy/payment.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
  });

  it('should accept declared fields on complete', async () => {
    await request(app.getHttpServer())
      .post('/supplier-payments/tx-1/complete')
      .send({
        paymentMethod: 'TRANSFER',
        note: 'confirmed',
      })
      .expect(201);

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });
});