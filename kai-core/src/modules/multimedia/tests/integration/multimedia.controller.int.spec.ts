import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { MultimediaController } from '@modules/multimedia/presentation/multimedia.controller';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AppConfigService } from '../../../../../src/config/config.service';

describe('MultimediaController (Integration)', () => {
  let app: INestApplication;
  let multimediaService: {
    upload: jest.Mock;
    findById: jest.Mock;
    listByEntity: jest.Mock;
    link: jest.Mock;
    unlink: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    multimediaService = {
      upload: jest.fn().mockResolvedValue({ id: 'asset-1' }),
      findById: jest.fn(),
      listByEntity: jest.fn(),
      link: jest.fn().mockResolvedValue({ id: 'link-1' }),
      unlink: jest.fn(),
      delete: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MultimediaController],
      providers: [
        {
          provide: MultimediaServiceAdapter,
          useValue: multimediaService,
        },
        {
          provide: AppConfigService,
          useValue: {
            storage: {
              strategy: 'local',
              local: { path: '/tmp/media' },
            },
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

  it('should accept multipart upload and coerce isPrimary to boolean', async () => {
    await request(app.getHttpServer())
      .post('/multimedia/assets')
      .field('entityType', 'product')
      .field('entityId', 'product-1')
      .field('usageType', 'primary-image')
      .field('isPrimary', 'true')
      .attach('file', Buffer.from('file-content'), 'photo.png')
      .expect(201)
      .expect({
        success: true,
        data: { id: 'asset-1' },
      });

    expect(multimediaService.upload).toHaveBeenCalledWith({
      file: expect.objectContaining({
        originalName: 'photo.png',
        mimeType: 'image/png',
      }),
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      isPrimary: true,
    });
  });

  it('should reject legacy or unknown fields on link requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/multimedia/assets/asset-1/links')
      .send({
        entityType: 'product',
        entityId: 'product-1',
        imagePath: '/legacy/image.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(multimediaService.link).not.toHaveBeenCalled();
  });
});