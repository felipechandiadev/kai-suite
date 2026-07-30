import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AccountingPeriodsController } from '@modules/accounting-periods/presentation/accounting-periods.controller';
import { AccountingPeriodsService } from '@modules/accounting-periods/application/accounting-periods.service';

describe('AccountingPeriodsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    ensurePeriod: jest.Mock;
    closePeriod: jest.Mock;
    reopenPeriod: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'period-1' }),
      ensurePeriod: jest.fn().mockResolvedValue({ id: 'period-1' }),
      closePeriod: jest.fn().mockResolvedValue({ id: 'period-1' }),
      reopenPeriod: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountingPeriodsController],
      providers: [
        {
          provide: AccountingPeriodsService,
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
      .get('/accounting/periods')
      .query({ extra: 'value' })
      .expect(400);

    expect(response.body.message).toContain('property extra should not exist');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('should accept declared query params on list', async () => {
    await request(app.getHttpServer())
      .get('/accounting/periods')
      .query({ year: '2026', status: 'OPEN' })
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      companyId: undefined,
      status: 'OPEN',
      year: 2026,
    });
  });

  it('should reject unknown fields on ensure body', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounting/periods/ensure')
      .send({
        date: '2026-04-19',
        imagePath: '/legacy/path',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.ensurePeriod).not.toHaveBeenCalled();
  });
});