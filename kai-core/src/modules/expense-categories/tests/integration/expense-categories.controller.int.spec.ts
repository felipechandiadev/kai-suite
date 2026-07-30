import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ExpenseCategoriesController } from '@modules/expense-categories/presentation/expense-categories.controller';
import { ExpenseCategoriesService } from '@modules/expense-categories/application/expense-categories.service';

describe('ExpenseCategoriesController (Integration)', () => {
  let app: INestApplication;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'ec-1' }),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseCategoriesController],
      providers: [
        {
          provide: ExpenseCategoriesService,
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

  it('should reject unknown fields on update requests', async () => {
    const response = await request(app.getHttpServer())
      .put('/expense-categories/ec-1')
      .send({
        name: 'Updated name',
        imagePath: '/legacy/expense-category.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.update).not.toHaveBeenCalled();
  });

  it('should accept declared update fields', async () => {
    await request(app.getHttpServer())
      .put('/expense-categories/ec-1')
      .send({
        name: 'Updated name',
        operationalExpenseGroup: 'PERSONAL_NOMINA',
        pnlNature: 'SALES',
        requiresApproval: true,
        examples: ['invoice', 'fuel'],
      })
      .expect(200);

    expect(service.update).toHaveBeenCalledWith('ec-1', {
      name: 'Updated name',
      operationalExpenseGroup: 'PERSONAL_NOMINA',
      pnlNature: 'SALES',
      requiresApproval: true,
      examples: ['invoice', 'fuel'],
    });
  });
});