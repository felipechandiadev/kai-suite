import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ProductsController } from '@modules/products/presentation/products.controller';
import { ProductsServiceAdapter } from '@modules/products/application/products.service.adapter';
import { ProductsPosService } from '@modules/products/application/products-pos.service';

describe('ProductsController (Integration)', () => {
  let app: INestApplication;
  let productsService: {
    search: jest.Mock;
    getStocks: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    productsService = {
      search: jest.fn(),
      getStocks: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'product-1' }),
      update: jest.fn().mockResolvedValue({ id: 'product-1' }),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsServiceAdapter,
          useValue: productsService,
        },
        {
          provide: ProductsPosService,
          useValue: { searchForPos: jest.fn() },
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

  it('should reject legacy imagePath in create requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Ring',
        categoryId: '11111111-1111-4111-8111-111111111111',
        imagePath: '/legacy/ring.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(productsService.create).not.toHaveBeenCalled();
  });

  it('should accept multimediaAssetIds in create requests', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Ring',
        categoryId: '11111111-1111-4111-8111-111111111111',
        multimediaAssetIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);

    expect(productsService.create).toHaveBeenCalledWith({
      name: 'Ring',
      categoryId: '11111111-1111-4111-8111-111111111111',
      multimediaAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
  });

  it('should reject unknown query params on list', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .query({ imagePath: '/legacy/ring.png' })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(productsService.search).not.toHaveBeenCalled();
  });

  it('should accept declared query params on list', async () => {
    productsService.search.mockResolvedValueOnce({ items: [], total: 0 });

    await request(app.getHttpServer())
      .get('/products')
      .query({ query: 'ring', page: '2', pageSize: '15' })
      .expect(200);

    expect(productsService.search).toHaveBeenCalledWith({
      query: 'ring',
      page: 2,
      pageSize: 15,
      priceListId: undefined,
    });
  });
});