import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthServiceAdapter } from '@modules/auth/application/auth.service.adapter';

describe('AuthServiceAdapter (Integration)', () => {
  let service: AuthServiceAdapter;
  let commandBus: { execute: jest.Mock };

  const mockLoginResult = {
    success: true,
    user: {
      id: 'user-id',
      userName: 'testuser',
      email: 'test@example.com',
      rol: 'ADMIN',
    },
  };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn().mockResolvedValue(mockLoginResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceAdapter,
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthServiceAdapter>(AuthServiceAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should execute login command through CQRS', async () => {
      const loginDto = {
        userName: 'testuser',
        password: 'password',
      };

      const result = await service.login(loginDto);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.user?.userName).toBe('testuser');
    });
  });

  describe('logout', () => {
    it('should execute logout command through CQRS', async () => {
      const logoutDto = {
        userId: 'user-id',
      };

      commandBus.execute.mockResolvedValueOnce({ success: true });

      const result = await service.logout(logoutDto);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Logout successful');
    });
  });
});
