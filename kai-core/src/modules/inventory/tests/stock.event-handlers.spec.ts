import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  StockAdjustedEventHandler,
  StockTransferredEventHandler,
} from '../application/handlers/events/stock.event-handlers';
import {
  StockAdjustedEvent,
  StockTransferredEvent,
} from '../domain/events/stock-adjusted.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

describe('StockAdjustedEventHandler', () => {
  let handler: StockAdjustedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustedEventHandler,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
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

    handler = module.get<StockAdjustedEventHandler>(StockAdjustedEventHandler);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on stock adjustment', async () => {
      const event = new StockAdjustedEvent(
        'variant-1',
        'storage-1',
        100,
        110,
        10,
        'IN',
        'counting-adjustment',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith({
        entityName: 'Stock',
        entityId: 'variant-1',
        action: AuditActionType.UPDATE,
        newValues: {
          variantId: 'variant-1',
          storageId: 'storage-1',
          diff: 10,
          adjustmentType: 'IN',
        },
      });

      expect(mockCacheService.del).toHaveBeenCalledWith('stock:variant-1');
      expect(mockCacheService.del).toHaveBeenCalledWith('storage:storage-1');
    });

    it('should handle service errors gracefully', async () => {
      mockAuditService.logAudit.mockRejectedValueOnce(
        new Error('Audit service failed'),
      );

      const event = new StockAdjustedEvent(
        'variant-1',
        'storage-1',
        50,
        60,
        10,
        'IN',
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('StockTransferredEventHandler', () => {
  let handler: StockTransferredEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTransferredEventHandler,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
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

    handler = module.get<StockTransferredEventHandler>(
      StockTransferredEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on stock transfer', async () => {
      const event = new StockTransferredEvent(
        'variant-1',
        'storage-1',
        'storage-2',
        25,
        ['DOC0001', 'DOC0002'],
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith({
        entityName: 'Stock',
        entityId: 'variant-1',
        action: AuditActionType.UPDATE,
        newValues: {
          variantId: 'variant-1',
          sourceStorageId: 'storage-1',
          targetStorageId: 'storage-2',
          quantity: 25,
        },
      });

      expect(mockCacheService.del).toHaveBeenCalledWith('stock:variant-1');
      expect(mockCacheService.del).toHaveBeenCalledWith('storage:storage-1');
      expect(mockCacheService.del).toHaveBeenCalledWith('storage:storage-2');
    });
  });
});
