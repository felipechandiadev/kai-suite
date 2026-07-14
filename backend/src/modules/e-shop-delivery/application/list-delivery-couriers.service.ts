import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import type { DeliveryDriverDto } from '../domain/delivery.types';

@Injectable()
export class ListDeliveryCouriersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async list(companyId: string): Promise<DeliveryDriverDto[]> {
    const rows = await this.userRepo.find({
      where: {
        companyId,
        rol: UserRole.COURIER,
        deletedAt: IsNull(),
      },
      relations: { person: true },
      order: { userName: 'ASC' },
    });

    return rows.map((user) => {
      const personName = user.person
        ? [user.person.firstName, user.person.lastName].filter(Boolean).join(' ').trim()
        : '';
      return {
        id: user.id,
        login: user.userName,
        displayName: personName || user.userName || user.mail || 'Repartidor',
        email: user.mail ?? null,
      };
    });
  }

  async assertIsCourier(companyId: string, userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
        companyId,
        rol: UserRole.COURIER,
        deletedAt: IsNull(),
      },
      relations: { person: true },
    });
    if (!user) {
      throw new BadRequestException(
        'El usuario no es un repartidor válido de esta empresa',
      );
    }
    return user;
  }

  formatLabel(user: User | null | undefined): string | null {
    if (!user) return null;
    const personName = user.person
      ? [user.person.firstName, user.person.lastName].filter(Boolean).join(' ').trim()
      : '';
    return personName || user.userName || user.mail || null;
  }
}
