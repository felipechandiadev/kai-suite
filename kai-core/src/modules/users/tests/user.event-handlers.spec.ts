import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UserCreatedEventHandler } from '../application/handlers/events/user-created.handler';
import { UserUpdatedEventHandler } from '../application/handlers/events/user-updated.handler';
import { UserRemovedEventHandler } from '../application/handlers/events/user-removed.handler';
import { UserPasswordChangedEventHandler } from '../application/handlers/events/user-password-changed.handler';
import { UserCreatedEvent } from '../domain/events/user-created.event';
import { UserUpdatedEvent } from '../domain/events/user-updated.event';
import { UserRemovedEvent } from '../domain/events/user-removed.event';
import { UserPasswordChangedEvent } from '../domain/events/user-password-changed.event';
import { AuditService } from '@shared/application/AuditService';
import { CacheService } from '@shared/cache/cache.service';
import { AuditActionType } from '@modules/audits/domain/audit.types';

describe('UserCreatedEventHandler', () => {
  let handler: UserCreatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCreatedEventHandler,
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

    handler = module.get<UserCreatedEventHandler>(UserCreatedEventHandler);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on user creation', async () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
        undefined,
        'ADMIN',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith({
        entityName: 'User',
        entityId: 'user-1',
        action: AuditActionType.CREATE,
      });

      expect(mockCacheService.del).toHaveBeenCalledWith('users:all');
    });

    it('should handle missing services gracefully', async () => {
      const moduleNoServices: TestingModule = await Test.createTestingModule({
        providers: [UserCreatedEventHandler],
      }).compile();

      const handlerNoServices = moduleNoServices.get<UserCreatedEventHandler>(
        UserCreatedEventHandler,
      );

      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
      );

      await expect(handlerNoServices.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('UserUpdatedEventHandler', () => {
  let handler: UserUpdatedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserUpdatedEventHandler,
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

    handler = module.get<UserUpdatedEventHandler>(UserUpdatedEventHandler);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on user update', async () => {
      const event = new UserUpdatedEvent(
        'user-1',
        'updated_user',
        'admin-user',
      );

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'User',
          entityId: 'user-1',
          action: AuditActionType.UPDATE,
        }),
      );

      expect(mockCacheService.del).toHaveBeenCalledWith('users:all');
    });
  });
});

describe('UserRemovedEventHandler', () => {
  let handler: UserRemovedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRemovedEventHandler,
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

    handler = module.get<UserRemovedEventHandler>(UserRemovedEventHandler);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log audit and invalidate cache on user removal', async () => {
      const event = new UserRemovedEvent('user-1', 'john_doe');

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'User',
          entityId: 'user-1',
          action: AuditActionType.DELETE,
        }),
      );

      expect(mockCacheService.del).toHaveBeenCalledWith('users:all');
    });
  });
});

describe('UserPasswordChangedEventHandler', () => {
  let handler: UserPasswordChangedEventHandler;

  const mockAuditService = {
    logAudit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPasswordChangedEventHandler,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    handler = module.get<UserPasswordChangedEventHandler>(
      UserPasswordChangedEventHandler,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should log password change to audit trail', async () => {
      const event = new UserPasswordChangedEvent('user-1', 'user-1');

      await handler.handle(event);

      expect(mockAuditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'User',
          entityId: 'user-1',
          action: AuditActionType.PASSWORD_CHANGE,
        }),
      );
    });
  });
});
