import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProductCreatedEventHandler } from '../application/handlers/events/product-created.handler';
import { ProductUpdatedEventHandler } from '../application/handlers/events/product-updated.handler';
import { ProductRemovedEventHandler } from '../application/handlers/events/product-removed.handler';
import { ProductCreatedEvent } from '../domain/events/product-created.event';
import { ProductUpdatedEvent } from '../domain/events/product-updated.event';
import { ProductRemovedEvent } from '../domain/events/product-removed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

describe('ProductCreatedEventHandler', () => {
  let handler: ProductCreatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCreatedEventHandler,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    handler = module.get<ProductCreatedEventHandler>(
      ProductCreatedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on product creation', async () => {
      const event = new ProductCreatedEvent(
        'prod-1',
        'Laptop',
        'cat-1',
        'Dell',
        'SKU001',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith({
        entityName: 'Product',
        entityId: 'prod-1',
        action: AuditActionType.CREATE,
        newValues: {
          name: 'Laptop',
          sku: 'SKU001',
        },
      });

      expect(mockCacheService.del).toHaveBeenCalledWith('products:all');
      expect(mockCacheService.del).toHaveBeenCalledWith('product:prod-1');
    });

    it('should handle missing audit service gracefully', async () => {
      const moduleNoAudit: TestingModule = await Test.createTestingModule({
        providers: [
          ProductCreatedEventHandler,
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
        ],
      }).compile();

      const handlerNoAudit = moduleNoAudit.get<ProductCreatedEventHandler>(
        ProductCreatedEventHandler,
      );

      const event = new ProductCreatedEvent(
        'prod-1',
        'Laptop',
        'cat-1',
        'Dell',
        'SKU001',
      );

      await expect(handlerNoAudit.handle(event)).resolves.not.toThrow();
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockAuditService.logAudit.mockRejectedValueOnce(
        new Error('Audit service failed'),
      );

      const event = new ProductCreatedEvent(
        'prod-1',
        'Laptop',
        'cat-1',
        'Dell',
        'SKU001',
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('ProductUpdatedEventHandler', () => {
  let handler: ProductUpdatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductUpdatedEventHandler,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    handler = module.get<ProductUpdatedEventHandler>(
      ProductUpdatedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on product update', async () => {
      const event = new ProductUpdatedEvent(
        'prod-1',
        'Updated Laptop',
        'SKU002',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'Product',
          entityId: 'prod-1',
          action: AuditActionType.UPDATE,
        }),
      );

      expect(mockCacheService.del).toHaveBeenCalledWith('products:all');
      expect(mockCacheService.del).toHaveBeenCalledWith('product:prod-1');
    });
  });
});

describe('ProductRemovedEventHandler', () => {
  let handler: ProductRemovedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRemovedEventHandler,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    handler = module.get<ProductRemovedEventHandler>(
      ProductRemovedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on product removal', async () => {
      const event = new ProductRemovedEvent('prod-1', 'Laptop');

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'Product',
          entityId: 'prod-1',
          action: AuditActionType.DELETE,
        }),
      );

      expect(mockCacheService.del).toHaveBeenCalledWith('products:all');
      expect(mockCacheService.del).toHaveBeenCalledWith('product:prod-1');
    });
  });
});
