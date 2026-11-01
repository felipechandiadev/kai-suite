import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import type { Company } from '@modules/companies/domain/company.entity';
import type { MembershipsService } from '@modules/users/application/memberships.service';
import type { AuthTokenService } from '@common/auth/auth-token.service';
import { resolveHandshakeIdentity } from '@common/auth/ws-handshake-auth';
import type { CurrentUserPayload } from './current-user.decorator';

export type WsTenantDeps = {
  userRepository: Pick<Repository<User>, 'findOne'>;
  companyRepository: Pick<Repository<Company>, 'findOne'>;
  memberships: Pick<MembershipsService, 'getMembership'>;
  tokens: Pick<AuthTokenService, 'verifySocket' | 'allowLegacyUuidBearer'>;
  logger: Pick<Logger, 'warn'>;
  /** Nombre del gateway para el log de uso legacy. */
  gateway: string;
};

/**
 * Resuelve usuario + empresa activa del handshake Socket.IO.
 * - JWT firmado (typ=ws|access): empresa = header (SUPER_ADMIN) o `cid` con membership;
 *   si no, `user.companyId`.
 * - UUID legacy (solo con AUTH_ALLOW_LEGACY_UUID_BEARER): comportamiento previo intacto
 *   y se registra un warn por conexión.
 */
export async function resolveWsTenant(
  deps: WsTenantDeps,
  params: { userId: string | undefined; activeCompanyIdHeader: string | undefined },
): Promise<{ currentUser: CurrentUserPayload; activeCompanyId: string }> {
  const identity = resolveHandshakeIdentity(params.userId, deps.tokens, (uid) =>
    deps.logger.warn(
      `Legacy UUID en handshake WS ${deps.gateway} user=${uid.slice(0, 8)}…`,
    ),
  );

  const user = await deps.userRepository.findOne({ where: { id: identity.userId } });
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
    const headerCompanyId =
      params.activeCompanyIdHeader?.trim() || identity.tokenCompanyId || undefined;
    if (headerCompanyId && isUUID(headerCompanyId)) {
      const exists = await deps.companyRepository.findOne({
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
      const fallback = await deps.companyRepository.findOne({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
        select: { id: true },
      });
      if (fallback) {
        activeCompanyId = fallback.id;
      }
    }
  } else {
    if (identity.mode === 'jwt' && identity.tokenCompanyId) {
      const mem = await deps.memberships.getMembership(user.id, identity.tokenCompanyId);
      if (mem) activeCompanyId = identity.tokenCompanyId;
    }
    if (!activeCompanyId) {
      if (!user.companyId) {
        throw new ForbiddenException(
          'Usuario sin empresa asignada. Contacte al administrador.',
        );
      }
      activeCompanyId = user.companyId;
    }
  }

  if (!activeCompanyId) {
    throw new ForbiddenException(
      'No hay empresa activa para esta sesión. Selecciona una empresa.',
    );
  }

  return { currentUser, activeCompanyId };
}
