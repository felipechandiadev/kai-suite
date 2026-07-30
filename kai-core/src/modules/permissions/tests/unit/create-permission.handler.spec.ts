import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { CreatePermissionCommandHandler } from '../../application/commands/handlers/create-permission.handler';
import { CreatePermissionCommand } from '../../application/commands/create-permission.command';
import { PermissionRepositoryPort } from '../../application/ports/permission.repository.port';
import { Permission } from '../../domain/permission.entity';
import { PermissionCreatedEvent } from '../../domain/events/permission-created.event';

describe('CreatePermissionCommandHandler', () => {
  let handler: CreatePermissionCommandHandler;
  let mockRepository: jest.Mocked<PermissionRepositoryPort>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePermissionCommandHandler,
        {
          provide: 'PermissionRepositoryPort',
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<CreatePermissionCommandHandler>(
      CreatePermissionCommandHandler,
    );
  });

  it('should create and save a permission', async () => {
    const command = new CreatePermissionCommand(
      'permission-1',
      'read:users',
      'user-1',
      'Can read users',
    );

    await handler.execute(command);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    const savedPermission = mockRepository.save.mock.calls[0][0];
    expect(savedPermission).toBeInstanceOf(Permission);
    expect(savedPermission.id).toBe('permission-1');
    expect(savedPermission.ability).toBe('read:users');
    expect(savedPermission.userId).toBe('user-1');
    expect(savedPermission.description).toBe('Can read users');

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.any(PermissionCreatedEvent),
    );
  });
});
