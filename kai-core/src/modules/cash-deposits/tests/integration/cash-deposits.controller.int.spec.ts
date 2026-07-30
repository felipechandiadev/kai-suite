import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CashDepositsController } from '@modules/cash-deposits/presentation/cash-deposits.controller';
import { CashDepositsService } from '@modules/cash-deposits/application/cash-deposits.service';

describe('CashDepositsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    list: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CashDepositsController],
      providers: [
        {
          provide: CashDepositsService,
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

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/cash-deposits')
      .send({
        bankAccountKey: 'main-bank',
        amount: 1500,
        imagePath: '/legacy/path',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept declared fields on create', async () => {
    await request(app.getHttpServer())
      .post('/cash-deposits')
      .send({
        bankAccountKey: 'main-bank',
        cashHubId: '223e4567-e89b-12d3-a456-426614174000',
        amount: 1500,
        occurredOn: '2026-04-19',
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith({
      bankAccountKey: 'main-bank',
      cashHubId: '223e4567-e89b-12d3-a456-426614174000',
      amount: 1500,
      occurredOn: '2026-04-19',
    });
  });
});