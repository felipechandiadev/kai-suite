import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockAlertNotificationService } from '../../application/stock-alert-notification.service';
import { StockNotificationEvaluator } from '../../application/stock-notification.evaluator';
import { NotificationPublisherService } from '../../application/notification-publisher.service';
import { StockNotificationKind } from '../../domain/notification.enums';
import { AudienceResolverService } from '../../application/audience-resolver.service';

describe('StockAlertNotificationService', () => {
  let service: StockAlertNotificationService;
  let publish: jest.Mock;

  const variant = {
    id: 'v1',
    companyId: 'c1',
    minimumStock: 10,
    maximumStock: 0,
    reorderPoint: 0,
    attributeValues: {},
    product: { name: 'Aceite' },
  };

  beforeEach(async () => {
    publish = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAlertNotificationService,
        StockNotificationEvaluator,
        {
          provide: AudienceResolverService,
          useValue: {
            stockDefaultAudiences: jest.fn().mockReturnValue([
              { audienceType: 'ROLES', audienceConfig: { roles: ['ADMIN'] } },
            ]),
          },
        },
        {
          provide: NotificationPublisherService,
          useValue: {
            isStockNotificationsEnabled: () => true,
            publish,
          },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity: unknown) => {
              if (entity === ProductVariant) {
                return { findOne: jest.fn().mockResolvedValue(variant) };
              }
              if (entity === StockLevel) {
                return {
                  findOne: jest.fn().mockResolvedValue(null),
                  find: jest.fn().mockResolvedValue([]),
                };
              }
              if (entity === Storage) {
                return {
                  findOne: jest.fn().mockResolvedValue({ id: 's1', name: 'Bodega' }),
                };
              }
              return { findOne: jest.fn().mockResolvedValue(null) };
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StockAlertNotificationService);
  });

  it('publishes below-minimum using physicalStockOverride when row is missing', async () => {
    await service.publishForVariantStorage({
      companyId: 'c1',
      productVariantId: 'v1',
      storageId: 's1',
      physicalStockOverride: 2,
    });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0].kind).toBe(StockNotificationKind.BELOW_MINIMUM);
  });
});
