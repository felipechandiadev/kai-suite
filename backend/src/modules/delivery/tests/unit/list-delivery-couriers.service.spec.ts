import { BadRequestException } from '@nestjs/common';
import { ListDeliveryCouriersService } from '../../application/list-delivery-couriers.service';
import { UserRole } from '@modules/users/domain/user.entity';

describe('ListDeliveryCouriersService', () => {
  const userRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const service = new ListDeliveryCouriersService(userRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only COURIER users of the company with display names', async () => {
    userRepo.find.mockResolvedValue([
      {
        id: 'u1',
        userName: 'juan.courier',
        mail: 'juan@kai.cl',
        person: { firstName: 'Juan', lastName: 'Pérez' },
      },
      {
        id: 'u2',
        userName: 'solo.login',
        mail: 'solo@kai.cl',
        person: null,
      },
    ]);

    const rows = await service.list('company-1');
    expect(userRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          rol: UserRole.COURIER,
        }),
      }),
    );
    expect(rows).toEqual([
      {
        id: 'u1',
        login: 'juan.courier',
        displayName: 'Juan Pérez',
        email: 'juan@kai.cl',
      },
      {
        id: 'u2',
        login: 'solo.login',
        displayName: 'solo.login',
        email: 'solo@kai.cl',
      },
    ]);
  });

  it('rejects non-courier assignment', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.assertIsCourier('company-1', 'u9')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
