import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AccountBalancesController } from '@modules/account-balances/presentation/account-balances.controller';
import { AccountBalancesServiceAdapter } from '@modules/account-balances/application/services/account-balances.service.adapter';

describe('AccountBalancesController (Integration)', () => {
  let app: INestApplication;
  let service: {
    getBalancesForPeriod: jest.Mock;
    updateBalancesForLedgerEntries: jest.Mock;
    freezeBalancesForPeriod: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getBalancesForPeriod: jest.fn().mockResolvedValue([]),
      updateBalancesForLedgerEntries: jest.fn().mockResolvedValue(undefined),
      freezeBalancesForPeriod: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AccountBalancesController],
      providers: [
        {
          provide: AccountBalancesServiceAdapter,
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

  it('should reject unknown query params on get balances', async () => {
    const response = await request(app.getHttpServer())
      .get('/account-balances')
      .query({
        companyId: '11111111-1111-4111-8111-111111111111',
        periodId: '22222222-2222-4222-8222-222222222222',
        extra: 'value',
      })
      .expect(400);

    expect(response.body.message).toContain('property extra should not exist');
    expect(service.getBalancesForPeriod).not.toHaveBeenCalled();
  });

  it('should reject malformed ledger entry payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/account-balances/update-for-ledger-entries')
      .send({
        ledgerEntries: [
          {
            transactionId: '11111111-1111-4111-8111-111111111111',
            accountId: '22222222-2222-4222-8222-222222222222',
            debit: 100,
            credit: 0,
            imagePath: '/legacy',
          },
        ],
      })
      .expect(400);

    expect(response.body.message).toContain(
      'ledgerEntries.0.property imagePath should not exist',
    );
    expect(service.updateBalancesForLedgerEntries).not.toHaveBeenCalled();
  });

  it('should accept declared ledger entry payloads', async () => {
    await request(app.getHttpServer())
      .post('/account-balances/update-for-ledger-entries')
      .send({
        ledgerEntries: [
          {
            transactionId: '11111111-1111-4111-8111-111111111111',
            accountId: '22222222-2222-4222-8222-222222222222',
            debit: 100,
            credit: 0,
          },
        ],
      })
      .expect(201);

    expect(service.updateBalancesForLedgerEntries).toHaveBeenCalledWith([
      {
        transactionId: '11111111-1111-4111-8111-111111111111',
        accountId: '22222222-2222-4222-8222-222222222222',
        debit: 100,
        credit: 0,
      },
    ]);
  });
});