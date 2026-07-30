import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CategoryCreatedEventHandler } from '../application/handlers/events/category-created.handler';
import { CategoryUpdatedEventHandler } from '../application/handlers/events/category-updated.handler';
import { CategoryRemovedEventHandler } from '../application/handlers/events/category-removed.handler';
import { CategoryCreatedEvent } from '../domain/events/category-created.event';
import { CategoryUpdatedEvent } from '../domain/events/category-updated.event';
import { CategoryRemovedEvent } from '../domain/events/category-removed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

describe('CategoryCreatedEventHandler', () => {
  let handler: CategoryCreatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryCreatedEventHandler,
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

    handler = module.get<CategoryCreatedEventHandler>(
      CategoryCreatedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and clear cache on category creation', async () => {
      const event = new CategoryCreatedEvent(
        'cat-1',
        'Electronics',
        'ELEC',
        'Electronic products',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith({
        entityName: 'Category',
        entityId: 'cat-1',
        action: AuditActionType.CREATE,
        newValues: {
          name: 'Electronics',
          code: 'ELEC',
        },
      });

      expect(mockCacheService.del).toHaveBeenCalledWith('categories:all');
    });

    it('should handle missing audit service gracefully', async () => {
      const moduleNoAudit: TestingModule = await Test.createTestingModule({
        providers: [
          CategoryCreatedEventHandler,
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
        ],
      }).compile();

      const handlerNoAudit = moduleNoAudit.get<CategoryCreatedEventHandler>(
        CategoryCreatedEventHandler,
      );

      const event = new CategoryCreatedEvent('cat-1', 'Electronics', 'ELEC');

      await expect(handlerNoAudit.handle(event)).resolves.not.toThrow();
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockAuditService.logAudit.mockRejectedValueOnce(
        new Error('Audit service failed'),
      );

      const event = new CategoryCreatedEvent('cat-1', 'Electronics', 'ELEC');

      await expect(handler.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('CategoryUpdatedEventHandler', () => {
  let handler: CategoryUpdatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryUpdatedEventHandler,
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

    handler = module.get<CategoryUpdatedEventHandler>(
      CategoryUpdatedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit on category update', () => {
      const event = new CategoryUpdatedEvent(
        'cat-1',
        'Updated Electronics',
        'Updated description',
      );

      handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'Category',
          entityId: 'cat-1',
          action: AuditActionType.UPDATE,
        }),
      );
    });
  });
});

describe('CategoryRemovedEventHandler', () => {
  let handler: CategoryRemovedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRemovedEventHandler,
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

    handler = module.get<CategoryRemovedEventHandler>(
      CategoryRemovedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit on category removal', () => {
      const event = new CategoryRemovedEvent('cat-1', 'Duplicate category');

      handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'Category',
          entityId: 'cat-1',
          action: AuditActionType.DELETE,
        }),
      );
    });
  });
});
