import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { BankMovementsController } from '@modules/bank-movements/presentation/bank-movements.controller';
import { BankMovementsService } from '@modules/bank-movements/application/bank-movements.service';

describe('BankMovementsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    getOverview: jest.Mock;
    list: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getOverview: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BankMovementsController],
      providers: [
        {
          provide: BankMovementsService,
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

  it('should reject any body fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/bank-movements')
      .send({ amount: 100 })
      .expect(400);

    expect(response.body.message).toContain('property amount should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept an empty body on create', async () => {
    await request(app.getHttpServer())
      .post('/bank-movements')
      .send({})
      .expect(201);

    expect(service.create).toHaveBeenCalledTimes(1);
  });
});