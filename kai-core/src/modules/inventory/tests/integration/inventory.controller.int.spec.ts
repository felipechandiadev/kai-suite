import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { InventoryController } from '@modules/inventory/presentation/inventory.controller';
import { InventoryService } from '@modules/inventory/application/inventory.service';

describe('InventoryController (Integration)', () => {
  let app: INestApplication;
  let service: {
    getFilters: jest.Mock;
    search: jest.Mock;
    adjust: jest.Mock;
    transfer: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getFilters: jest.fn(),
      search: jest.fn(),
      adjust: jest.fn().mockResolvedValue({ success: true }),
      transfer: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
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

  it('should reject unknown fields on adjust', async () => {
    const response = await request(app.getHttpServer())
      .post('/inventory/adjust')
      .send({
        variantId: '11111111-1111-4111-8111-111111111111',
        storageId: '22222222-2222-4222-8222-222222222222',
        currentQuantity: 5,
        targetQuantity: 7,
        imagePath: '/legacy/stock.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.adjust).not.toHaveBeenCalled();
  });

  it('should accept declared fields on transfer', async () => {
    await request(app.getHttpServer())
      .post('/inventory/transfer')
      .send({
        variantId: '11111111-1111-4111-8111-111111111111',
        sourceStorageId: '22222222-2222-4222-8222-222222222222',
        targetStorageId: '33333333-3333-4333-8333-333333333333',
        quantity: 4,
      })
      .expect(201);

    expect(service.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: '11111111-1111-4111-8111-111111111111',
        sourceStorageId: '22222222-2222-4222-8222-222222222222',
        targetStorageId: '33333333-3333-4333-8333-333333333333',
        quantity: 4,
      }),
    );
  });
});