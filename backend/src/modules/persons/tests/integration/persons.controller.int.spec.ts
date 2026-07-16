import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PersonsController } from '@modules/persons/presentation/persons.controller';
import { PersonsService } from '@modules/persons/application/persons.service';
import { SiiTaxStatusService } from '@modules/persons/application/sii-tax-status.service';

describe('PersonsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    addBankAccount: jest.Mock;
    removeBankAccount: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'person-1' }),
      update: jest.fn(),
      remove: jest.fn(),
      addBankAccount: jest.fn().mockResolvedValue({ id: 'person-1' }),
      removeBankAccount: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PersonsController],
      providers: [
        {
          provide: PersonsService,
          useValue: service,
        },
        {
          provide: SiiTaxStatusService,
          useValue: { lookup: jest.fn() },
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
      .get('/persons')
      .query({ imagePath: '/legacy/path' })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/persons')
      .send({
        firstName: 'Felipe',
        imagePath: '/legacy/path',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept declared fields on create', async () => {
    await request(app.getHttpServer())
      .post('/persons')
      .send({
        firstName: 'Felipe',
        type: 'NATURAL',
        email: 'felipe@example.com',
        bankAccounts: [
          {
            bankName: 'Banco Santander Chile',
            accountType: 'Cuenta Corriente',
            accountNumber: '12345678',
            isPrimary: true,
          },
        ],
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith({
      firstName: 'Felipe',
      type: 'NATURAL',
      email: 'felipe@example.com',
      bankAccounts: [
        {
          bankName: 'Banco Santander Chile',
          accountType: 'Cuenta Corriente',
          accountNumber: '12345678',
          isPrimary: true,
        },
      ],
    });
  });

  it('should reject unknown fields on add bank account', async () => {
    const response = await request(app.getHttpServer())
      .post('/persons/11111111-1111-4111-8111-111111111111/bank-accounts')
      .send({
        bankName: 'Banco Santander Chile',
        accountType: 'Cuenta Corriente',
        accountNumber: '12345678',
        metadata: 'legacy',
      })
      .expect(400);

    expect(response.body.message).toContain('property metadata should not exist');
    expect(service.addBankAccount).not.toHaveBeenCalled();
  });
});