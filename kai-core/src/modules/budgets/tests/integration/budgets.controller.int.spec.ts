import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { BudgetsController } from '@modules/budgets/presentation/budgets.controller';
import { BudgetsServiceAdapter } from '@modules/budgets/application/budgets.service.adapter';

describe('BudgetsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        {
          provide: BudgetsServiceAdapter,
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

  it('should reject unknown query params on list', async () => {
    const response = await request(app.getHttpServer())
      .get('/budgets')
      .query({ foo: 'bar' })
      .expect(400);

    expect(response.body.message).toContain('property foo should not exist');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('should accept declared query params on list', async () => {
    await request(app.getHttpServer())
      .get('/budgets')
      .query({ limit: '25', offset: '5', status: 'ACTIVE' })
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      limit: 25,
      offset: 5,
      status: 'ACTIVE',
    });
  });
});