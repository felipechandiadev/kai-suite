import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { BankAccountsController } from '@modules/bank-accounts/presentation/bank-accounts.controller';
import { BankAccountsServiceAdapter } from '@modules/bank-accounts/application/bank-accounts.service.adapter';

describe('BankAccountsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    getCashBalance: jest.Mock;
    list: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getCashBalance: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ accountKey: 'acc-1' }),
      update: jest.fn().mockResolvedValue({ accountKey: 'acc-1' }),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountsController],
      providers: [
        {
          provide: BankAccountsServiceAdapter,
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
      .post('/bank-accounts')
      .send({
        ownerType: 'person',
        ownerId: '11111111-1111-4111-8111-111111111111',
        bankName: 'Banco de Chile',
        accountType: 'Cuenta Corriente',
        accountNumber: '123456789',
        imagePath: '/legacy/bank.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept declared fields on create', async () => {
    await request(app.getHttpServer())
      .post('/bank-accounts')
      .send({
        ownerType: 'person',
        ownerId: '11111111-1111-4111-8111-111111111111',
        bankName: 'Banco de Chile',
        accountType: 'Cuenta Corriente',
        accountNumber: '123456789',
        isPrimary: true,
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith({
      ownerType: 'person',
      ownerId: '11111111-1111-4111-8111-111111111111',
      bankName: 'Banco de Chile',
      accountType: 'Cuenta Corriente',
      accountNumber: '123456789',
      isPrimary: true,
    });
  });
});