import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CommandBus } from '@nestjs/cqrs';
import { OperatingExpenseTransactionsController } from '@modules/transactions/presentation/operating-expense-transactions.controller';

describe('OperatingExpenseTransactionsController (Integration)', () => {
  let app: INestApplication;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OperatingExpenseTransactionsController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
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

    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: '11111111-1111-4111-8111-111111111111' };
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/operating-expense-transactions')
      .send({
        branchId: '22222222-2222-4222-8222-222222222222',
        total: 100,
        imagePath: '/legacy/expense.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});