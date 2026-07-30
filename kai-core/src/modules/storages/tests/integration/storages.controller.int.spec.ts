import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { StoragesController } from '@modules/storages/presentation/storages.controller';
import { StoragesService } from '@modules/storages/application/storages.service';

describe('StoragesController (Integration)', () => {
  let app: INestApplication;
  let service: {
    getAllStorages: jest.Mock;
    getStorageById: jest.Mock;
    createStorage: jest.Mock;
    updateStorage: jest.Mock;
    deleteStorage: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAllStorages: jest.fn(),
      getStorageById: jest.fn(),
      createStorage: jest.fn().mockResolvedValue({ success: true }),
      updateStorage: jest.fn().mockResolvedValue({ success: true }),
      deleteStorage: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StoragesController],
      providers: [
        {
          provide: StoragesService,
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
      .post('/storages')
      .send({
        name: 'Main Warehouse',
        category: 'IN_BRANCH',
        type: 'WAREHOUSE',
        imagePath: '/legacy/storage.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.createStorage).not.toHaveBeenCalled();
  });

  it('should accept declared fields on create', async () => {
    await request(app.getHttpServer())
      .post('/storages')
      .send({
        name: 'Main Warehouse',
        category: 'IN_BRANCH',
        type: 'WAREHOUSE',
        isDefault: false,
      })
      .expect(201);

    expect(service.createStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Main Warehouse',
        category: 'IN_BRANCH',
        type: 'WAREHOUSE',
        isDefault: false,
        isActive: true,
      }),
    );
  });
});