import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ProductVariantsController } from '@modules/product-variants/presentation/product-variants.controller';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';

describe('ProductVariantsController (Integration)', () => {
  let app: INestApplication;
  let variantsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    variantsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ success: true, variant: { id: 'variant-1' } }),
      update: jest.fn().mockResolvedValue({ success: true, variant: { id: 'variant-1' } }),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductVariantsController],
      providers: [
        {
          provide: ProductVariantsService,
          useValue: variantsService,
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

  it('should reject legacy imagePath in variant create requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/product-variants')
      .send({
        sku: 'SKU-1',
        unitId: '11111111-1111-4111-8111-111111111111',
        basePrice: 100,
        imagePath: '/legacy/variant.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(variantsService.create).not.toHaveBeenCalled();
  });

  it('should accept multimediaAssetIds in variant create requests', async () => {
    await request(app.getHttpServer())
      .post('/product-variants')
      .send({
        sku: 'SKU-1',
        unitId: '11111111-1111-4111-8111-111111111111',
        basePrice: 100,
        multimediaAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);

    expect(variantsService.create).toHaveBeenCalledWith({
      sku: 'SKU-1',
      unitId: '11111111-1111-4111-8111-111111111111',
      basePrice: 100,
      multimediaAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
  });
});