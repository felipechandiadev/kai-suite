import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import type { CurrentUserPayload } from '@common/tenant';

@Injectable()
export class WsDiningTenantService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async resolveSocketTenant(params: {
    userId: string | undefined;
    activeCompanyIdHeader: string | undefined;
  }): Promise<{ currentUser: CurrentUserPayload; activeCompanyId: string }> {
    const bearer = params.userId?.trim();
    if (!bearer || !isUUID(bearer)) {
      throw new UnauthorizedException(
        'Token de autenticación inválido o ausente',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: bearer } });
    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const currentUser: CurrentUserPayload = {
      id: user.id,
      userName: user.userName,
      rol: user.rol,
      companyId: user.companyId ?? null,
    };

    let activeCompanyId: string | null = null;

    if (user.rol === UserRole.SUPER_ADMIN) {
      const headerCompanyId = params.activeCompanyIdHeader?.trim();
      if (headerCompanyId && isUUID(headerCompanyId)) {
        const exists = await this.companyRepository.findOne({
          where: { id: headerCompanyId },
          select: { id: true, isActive: true },
        });
        if (!exists) {
          throw new ForbiddenException('Empresa activa no encontrada');
        }
        if (!exists.isActive) {
          throw new ForbiddenException('La empresa activa está inactiva');
        }
        activeCompanyId = headerCompanyId;
      } else {
        const fallback = await this.companyRepository.findOne({
          where: { isActive: true },
          order: { createdAt: 'ASC' },
          select: { id: true },
        });
        if (fallback) {
          activeCompanyId = fallback.id;
        }
      }
    } else {
      if (!user.companyId) {
        throw new ForbiddenException(
          'Usuario sin empresa asignada. Contacte al administrador.',
        );
      }
      activeCompanyId = user.companyId;
    }

    if (!activeCompanyId) {
      throw new ForbiddenException(
        'No hay empresa activa para esta sesión. Selecciona una empresa.',
      );
    }

    return { currentUser, activeCompanyId };
  }
}
