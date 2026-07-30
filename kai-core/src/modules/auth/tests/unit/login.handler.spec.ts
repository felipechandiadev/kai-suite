import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { LoginCommandHandler } from '@modules/auth/application/handlers/commands/login.handler';
import { LoginCommand } from '@modules/auth/application/commands/login.command';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';
import { Company } from '@modules/companies/domain/company.entity';
import { UserRole } from '@modules/users/domain/user.entity';

describe('LoginCommandHandler', () => {
  let handler: LoginCommandHandler;
  let authRepository: jest.Mocked<AuthRepositoryPort>;
  let companyRepository: { find: jest.Mock; findOne: jest.Mock };
  let eventBus: { publish: jest.Mock };

  const baseUser = {
    id: 'user-id',
    userName: 'testuser',
    pass: bcrypt.hashSync('password', 10),
    rol: UserRole.ADMIN,
    companyId: 'company-a',
    person: {
      id: 'person-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '123456789',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginCommandHandler,
        {
          provide: AUTH_REPOSITORY,
          useValue: {
            findUserByUsername: jest.fn(),
            saveUser: jest.fn(),
          },
        },
        { provide: EventBus, useValue: { publish: jest.fn() } },
        {
          provide: getRepositoryToken(Company),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<LoginCommandHandler>(LoginCommandHandler);
    authRepository = module.get(AUTH_REPOSITORY);
    eventBus = module.get<EventBus>(EventBus) as unknown as {
      publish: jest.Mock;
    };
    companyRepository = module.get(getRepositoryToken(Company));
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should reject unknown user', async () => {
      authRepository.findUserByUsername.mockResolvedValue(null);
      await expect(
        handler.execute(new LoginCommand('nope', 'x')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      authRepository.findUserByUsername.mockResolvedValue(baseUser as any);
      await expect(
        handler.execute(new LoginCommand('testuser', 'wrong')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('logs in a SUPER_ADMIN without hint and returns the first active company as active', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      } as any);
      companyRepository.find.mockResolvedValue([
        { id: 'company-a', razonSocial: 'A', nombreFantasia: null },
        { id: 'company-b', razonSocial: 'B', nombreFantasia: 'B trade' },
      ]);

      const result = await handler.execute(
        new LoginCommand('testuser', 'password'),
      );

      expect(result.success).toBe(true);
      expect(result.user?.rol).toBe(UserRole.SUPER_ADMIN);
      expect(result.user?.companyId).toBeNull();
      expect(result.companies).toEqual([
        { id: 'company-a', razonSocial: 'A', nombreFantasia: null },
        { id: 'company-b', razonSocial: 'B', nombreFantasia: 'B trade' },
      ]);
      expect(result.activeCompanyId).toBe('company-a');
    });

    const UUID_A = 'b3e0a8e0-8a9b-4f5a-9d4a-0a4c8d3b2f1e';
    const UUID_B = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const UUID_NOT_LISTED = 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f';

    it('logs in a SUPER_ADMIN respecting the company hint (valid match)', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      } as any);
      companyRepository.find.mockResolvedValue([
        { id: UUID_A, razonSocial: 'A', nombreFantasia: null },
        { id: UUID_B, razonSocial: 'B', nombreFantasia: null },
      ]);

      const result = await handler.execute(
        new LoginCommand('testuser', 'password', UUID_B),
      );

      expect(result.activeCompanyId).toBe(UUID_B);
    });

    it('rejects a SUPER_ADMIN with a hint pointing to an unknown company', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.SUPER_ADMIN,
        companyId: null,
      } as any);
      companyRepository.find.mockResolvedValue([
        { id: UUID_A, razonSocial: 'A', nombreFantasia: null },
      ]);

      await expect(
        handler.execute(
          new LoginCommand('testuser', 'password', UUID_NOT_LISTED),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('logs in an ADMIN when the hint matches its companyId', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.ADMIN,
        companyId: UUID_A,
      } as any);
      companyRepository.findOne.mockResolvedValue({
        id: UUID_A,
        razonSocial: 'Acme SpA',
        nombreFantasia: 'Acme Tienda',
      });

      const result = await handler.execute(
        new LoginCommand('testuser', 'password', UUID_A),
      );

      expect(result.success).toBe(true);
      expect(result.companies).toEqual([
        {
          id: UUID_A,
          razonSocial: 'Acme SpA',
          nombreFantasia: 'Acme Tienda',
        },
      ]);
      expect(result.user?.companyId).toBe(UUID_A);
      expect(result.activeCompanyId).toBe(UUID_A);
      expect(companyRepository.find).not.toHaveBeenCalled();
      expect(companyRepository.findOne).toHaveBeenCalledWith({
        where: { id: UUID_A },
      });
    });

    it('rejects an ADMIN whose hint points to a different company', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.ADMIN,
        companyId: UUID_A,
      } as any);

      await expect(
        handler.execute(new LoginCommand('testuser', 'password', UUID_B)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an OPERATOR whose hint points to a different company', async () => {
      authRepository.findUserByUsername.mockResolvedValue({
        ...baseUser,
        rol: UserRole.OPERATOR,
        companyId: UUID_A,
      } as any);

      await expect(
        handler.execute(new LoginCommand('testuser', 'password', UUID_B)),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
