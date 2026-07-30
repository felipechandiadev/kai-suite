import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { MembershipsService } from '@modules/users/application/memberships.service';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import {
  ADMIN_ONLY_KEY,
  ALLOW_ADMIN_WITHOUT_COMPANY_KEY,
  SKIP_TENANT_KEY,
  SUPER_ADMIN_ONLY_KEY,
} from './tenant.decorators';
import type { CurrentUserPayload } from './current-user.decorator';

const ACTIVE_COMPANY_HEADER = 'x-active-company-id';
const MULTI_COMPANY_HEADER = 'x-multi-company-mode';

/**
 * Resuelve tenant + roles vía memberships (dual-read legacy).
 * Multiempresa: activeCompanyId null; mutaciones bloqueadas salvo @AllowAdminWithoutCompany.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly membershipsService: MembershipsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const auth: string | undefined =
      req.headers?.authorization || req.headers?.Authorization;
    const bearer = auth?.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : null;

    if (!bearer || !isUUID(bearer)) {
      if (process.env.NODE_ENV !== 'production') {
        const method = req.method ?? '?';
        const path = req.originalUrl ?? req.url ?? '?';
        this.logger.debug(
          `Sin Bearer UUID en ${method} ${path} (Authorization: ${auth ? 'presente' : 'ausente'})`,
        );
      }
      throw new UnauthorizedException(
        'Token de autenticación inválido o ausente',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: bearer } });
    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    await this.membershipsService.ensureMembershipFromLegacy(user);

    const isSuper = user.rol === UserRole.SUPER_ADMIN;
    const memberships = isSuper
      ? []
      : await this.membershipsService.getMemberships(user.id);

    const headerVal = req.headers?.[ACTIVE_COMPANY_HEADER];
    const headerCompanyId =
      typeof headerVal === 'string'
        ? headerVal
        : Array.isArray(headerVal)
          ? headerVal[0]
          : null;
    const multiHeader = req.headers?.[MULTI_COMPANY_HEADER];
    const multiHeaderOn =
      multiHeader === '1' ||
      multiHeader === 'true' ||
      (Array.isArray(multiHeader) &&
        (multiHeader[0] === '1' || multiHeader[0] === 'true'));

    const canMulti =
      isSuper ||
      (memberships.length >= 2 &&
        memberships.some((m) => m.roles.includes(PlatformRoleCode.ADMIN)));

    let multiCompanyMode = false;
    let activeCompanyId: string | null = null;

    if (multiHeaderOn && canMulti) {
      multiCompanyMode = true;
      activeCompanyId = null;
    } else if (isSuper) {
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
      }
    } else if (headerCompanyId && isUUID(headerCompanyId)) {
      const mem = memberships.find((m) => m.companyId === headerCompanyId);
      if (!mem) {
        throw new ForbiddenException(
          'No tienes acceso a la empresa solicitada',
        );
      }
      activeCompanyId = headerCompanyId;
    } else if (memberships.length === 1) {
      activeCompanyId = memberships[0].companyId;
    } else if (user.companyId) {
      activeCompanyId = user.companyId;
    }

    const rolesForActive = isSuper
      ? [PlatformRoleCode.SUPER_ADMIN]
      : activeCompanyId
        ? (memberships.find((m) => m.companyId === activeCompanyId)?.roles ??
          [])
        : [...new Set(memberships.flatMap((m) => m.roles))];

    const isOwner = activeCompanyId
      ? !!memberships.find((m) => m.companyId === activeCompanyId)?.isOwner
      : false;

    const currentUser: CurrentUserPayload = {
      id: user.id,
      userName: user.userName,
      rol: user.rol,
      companyId: user.companyId ?? null,
      memberships: memberships.map((m) => ({
        companyId: m.companyId,
        roles: m.roles,
        isOwner: m.isOwner,
      })),
      roles: rolesForActive,
      isOwner,
      multiCompanyMode,
    };
    req.currentUser = currentUser;
    req.multiCompanyMode = multiCompanyMode;

    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (superAdminOnly && !isSuper) {
      throw new ForbiddenException(
        'Acceso restringido a super-administradores',
      );
    }

    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (adminOnly) {
      const ok =
        isSuper ||
        rolesForActive.includes(PlatformRoleCode.ADMIN) ||
        rolesForActive.includes(PlatformRoleCode.SUB_ADMIN) ||
        user.rol === UserRole.ADMIN ||
        user.rol === UserRole.SUB_ADMIN;
      if (!ok) {
        throw new ForbiddenException('Acceso restringido a administradores');
      }
    }

    const allowAdminWithoutCompany =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_ADMIN_WITHOUT_COMPANY_KEY,
        [context.getHandler(), context.getClass()],
      );

    const method = String(req.method || 'GET').toUpperCase();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (multiCompanyMode && isMutation && !allowAdminWithoutCompany) {
      throw new ForbiddenException(
        'El modo Multiempresa es de solo lectura. Selecciona una empresa para escribir.',
      );
    }

    if (!activeCompanyId && !allowAdminWithoutCompany && !multiCompanyMode) {
      if (isSuper) {
        const fallback = await this.companyRepository.findOne({
          where: { isActive: true },
          order: { createdAt: 'ASC' },
          select: { id: true },
        });
        if (fallback) activeCompanyId = fallback.id;
      }
    }

    if (!activeCompanyId && !allowAdminWithoutCompany && !multiCompanyMode) {
      throw new ForbiddenException(
        'No hay empresa activa para esta sesión. Selecciona una empresa.',
      );
    }

    req.activeCompanyId = activeCompanyId;
    return true;
  }
}
