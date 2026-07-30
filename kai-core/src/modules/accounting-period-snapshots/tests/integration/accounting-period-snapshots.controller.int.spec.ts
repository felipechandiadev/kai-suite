import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AccountingPeriodSnapshotsController } from '@modules/accounting-period-snapshots/presentation/accounting-period-snapshots.controller';
import { AccountingPeriodSnapshotsServiceAdapter } from '@modules/accounting-period-snapshots/application/accounting-period-snapshots.service.adapter';

describe('AccountingPeriodSnapshotsController (Integration)', () => {
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
      controllers: [AccountingPeriodSnapshotsController],
      providers: [
        {
          provide: AccountingPeriodSnapshotsServiceAdapter,
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
      .get('/accounting-period-snapshots')
      .query({ extra: 'value' })
      .expect(400);

    expect(response.body.message).toContain('property extra should not exist');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('should accept declared query params on list', async () => {
    await request(app.getHttpServer())
      .get('/accounting-period-snapshots')
      .query({ limit: '10', offset: '2', periodId: '11111111-1111-4111-8111-111111111111' })
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 2,
      periodId: '11111111-1111-4111-8111-111111111111',
    });
  });
});