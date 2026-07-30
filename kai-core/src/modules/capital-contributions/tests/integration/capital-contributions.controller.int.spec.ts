import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { CapitalContributionsController } from '@modules/capital-contributions/presentation/capital-contributions.controller';
import { CapitalContributionsService } from '@modules/capital-contributions/application/capital-contributions.service';

describe('CapitalContributionsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    list: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CapitalContributionsController],
      providers: [
        {
          provide: CapitalContributionsService,
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
      .post('/capital-contributions')
      .send({
        shareholderId: '11111111-1111-4111-8111-111111111111',
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
      .post('/capital-contributions')
      .send({
        shareholderId: '11111111-1111-4111-8111-111111111111',
        bankAccountKey: 'main-bank',
        amount: 1500,
        occurredOn: '2026-04-19',
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith({
      shareholderId: '11111111-1111-4111-8111-111111111111',
      bankAccountKey: 'main-bank',
      amount: 1500,
      occurredOn: '2026-04-19',
    });
  });

  it('should accept cash hub capital contribution without bank account', async () => {
    await request(app.getHttpServer())
      .post('/capital-contributions')
      .send({
        shareholderId: '11111111-1111-4111-8111-111111111111',
        cashHubId: '22222222-2222-4222-8222-222222222222',
        amount: 2500,
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith({
      shareholderId: '11111111-1111-4111-8111-111111111111',
      cashHubId: '22222222-2222-4222-8222-222222222222',
      amount: 2500,
    });
  });
});