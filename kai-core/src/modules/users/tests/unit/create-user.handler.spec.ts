import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateUserCommandHandler } from '../../application/handlers/commands/create-user.handler';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { User } from '../../domain/user.entity';
import { UserRepositoryPort } from '../../application/ports/user.repository.port';

describe('CreateUserCommandHandler', () => {
  let handler: CreateUserCommandHandler;
  let userRepository: UserRepositoryPort;
  let eventBus: EventBus;

  const mockUser = {
    id: 'user-id',
    userName: 'testuser',
    mail: 'test@example.com',
    pass: '$2a$10$hashedpassword',
    rol: 'operator',
    person: { id: 'person-id' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserCommandHandler,
        {
          provide: 'UserRepositoryPort',
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateUserCommandHandler>(CreateUserCommandHandler);
    userRepository = module.get<UserRepositoryPort>('UserRepositoryPort');
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should create user successfully', async () => {
      const command = new CreateUserCommand(
        'user-id',
        'testuser',
        'test@example.com',
        'password',
        'person-id',
        'operator',
      );

      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(eventBus, 'publish').mockImplementation();

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(result.userName).toBe('testuser');
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
