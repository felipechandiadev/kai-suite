import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CashSessionsController } from '@modules/cash-sessions/presentation/cash-sessions.controller';
import { CashSessionsService } from '@modules/cash-sessions/application/cash-sessions.service';
import { CashSessionCoreService } from '@modules/cash-sessions/application/cash-session-core.service';
import { SalesFromSessionService } from '@modules/cash-sessions/application/sales-from-session.service';
import { CashSessionIntegrityService } from '@modules/cash-sessions/application/cash-session-integrity.service';

describe('CashSessionsController (Integration)', () => {
  let app: INestApplication;
  let cashSessionsService: {
    registerCashDeposit: jest.Mock;
    registerCashWithdrawal: jest.Mock;
    registerOpeningTransaction: jest.Mock;
  };
  let coreService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    open: jest.Mock;
    close: jest.Mock;
    closeByUserName: jest.Mock;
  };

  beforeEach(async () => {
    cashSessionsService = {
      registerCashDeposit: jest.fn().mockResolvedValue({ success: true }),
      registerCashWithdrawal: jest.fn().mockResolvedValue({ success: true }),
      registerOpeningTransaction: jest.fn(),
    };
    coreService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      open: jest.fn().mockResolvedValue({ success: true }),
      close: jest.fn().mockResolvedValue({ success: true }),
      closeByUserName: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CashSessionsController],
      providers: [
        {
          provide: CashSessionCoreService,
          useValue: coreService,
        },
        {
          provide: SalesFromSessionService,
          useValue: { getSalesForSession: jest.fn(), createSale: jest.fn() },
        },
        {
          provide: CashSessionsService,
          useValue: cashSessionsService,
        },
        {
          provide: CashSessionIntegrityService,
          useValue: {
            validateIntegrity: jest.fn(),
            cleanupCorruptSessions: jest.fn(),
          },
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

  it('should reject unknown fields on cash deposit', async () => {
    const response = await request(app.getHttpServer())
      .post('/cash-sessions/cash-deposits')
      .send({
        userName: 'cashier',
        cashSessionId: '11111111-1111-4111-8111-111111111111',
        amount: 100,
        imagePath: '/legacy/deposit.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(cashSessionsService.registerCashDeposit).not.toHaveBeenCalled();
  });

  it('should accept declared fields on cash withdrawal', async () => {
    await request(app.getHttpServer())
      .post('/cash-sessions/cash-withdrawals')
      .send({
        userName: 'cashier',
        cashSessionId: '11111111-1111-4111-8111-111111111111',
        amount: 50,
        reason: 'petty cash',
      })
      .expect(201);

    expect(cashSessionsService.registerCashWithdrawal).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: 'cashier',
        cashSessionId: '11111111-1111-4111-8111-111111111111',
        amount: 50,
        reason: 'petty cash',
      }),
    );
  });

  it('should reject close requests without sessionId and cashSessionId', async () => {
    await request(app.getHttpServer())
      .post('/cash-sessions/close')
      .send({
        userId: '22222222-2222-4222-8222-222222222222',
      })
      .expect(400);
  });

  it('should accept close requests with a nested user id', async () => {
    await request(app.getHttpServer())
      .post('/cash-sessions/close')
      .send({
        sessionId: '11111111-1111-4111-8111-111111111111',
        user: {
          id: '22222222-2222-4222-8222-222222222222',
        },
      })
      .expect(201);

    expect(coreService.close).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
  });
});