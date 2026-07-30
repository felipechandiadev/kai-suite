import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../presentation/users.controller';
import { UsersService } from '../application/users.service';
import type { CurrentUserPayload } from '@common/tenant';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getAllUsers: jest.fn(),
    listSuperAdmins: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    changePassword: jest.fn(),
    changeOwnPassword: jest.fn(),
  };

  const fakeAdmin: CurrentUserPayload = {
    id: 'admin-1',
    userName: 'admin',
    rol: 'ADMIN',
    companyId: 'company-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users filtered by active company', async () => {
      const mockUsers = [
        { id: 'user-1', userName: 'john', mail: 'john@example.com' },
      ];
      mockUsersService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers(undefined, 'company-1');

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.getAllUsers).toHaveBeenCalledWith(
        undefined,
        'company-1',
      );
    });
  });

  describe('getSuperAdmins', () => {
    it('should return list of SUPER_ADMINs', async () => {
      const items = [{ id: 's-1', userName: 'sa' }];
      mockUsersService.listSuperAdmins.mockResolvedValue(items);

      const result = await controller.getSuperAdmins();

      expect(result).toEqual({ success: true, items });
    });
  });

  describe('createUser', () => {
    it('should pass active company to the service', async () => {
      const data: any = {
        userName: 'newuser',
        mail: 'new@example.com',
        password: 'secret',
      };
      mockUsersService.createUser.mockResolvedValue({ success: true });

      await controller.createUser(data, 'company-1');

      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'newuser',
          companyId: null,
        }),
        'company-1',
      );
    });
  });

  describe('deleteUser', () => {
    it('should forward current user for guardrails', async () => {
      mockUsersService.deleteUser.mockResolvedValue({ success: true });

      await controller.deleteUser('user-1', fakeAdmin);

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(
        'user-1',
        fakeAdmin,
      );
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      mockUsersService.changePassword.mockResolvedValue({ success: true });

      const res = await controller.changePassword('user-1', {
        password: 'newpassword',
      });

      expect(res).toEqual({ success: true });
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'newpassword',
      );
    });
  });
});
