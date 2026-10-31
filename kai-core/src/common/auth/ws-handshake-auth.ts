import { UnauthorizedException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { AuthTokenService } from './auth-token.service';
import { JwtVerifyError, looksLikeJwt } from './jwt-hs256';

export type HandshakeIdentity = {
  userId: string;
  /** `cid` del token firmado (null en modo legacy o si no venía). */
  tokenCompanyId: string | null;
  mode: 'jwt' | 'legacy';
};

/**
 * Credencial del handshake Socket.IO: `auth.token` (JWT firmado) tiene prioridad;
 * `auth.userId` se mantiene para clientes legacy (waiter, pos, admin, ...).
 */
export function readHandshakeCredential(
  auth: Record<string, unknown> | undefined | null,
): string | undefined {
  const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return pick(auth?.token) ?? pick(auth?.userId);
}

/**
 * Valida la credencial del handshake:
 * - JWT (typ=ws o access) firmado con JWT_SECRET → userId = sub.
 * - UUID crudo → solo si AUTH_ALLOW_LEGACY_UUID_BEARER lo permite (se avisa vía onLegacy).
 */
export function resolveHandshakeIdentity(
  raw: string | undefined,
  tokens: Pick<AuthTokenService, 'verifySocket' | 'allowLegacyUuidBearer'>,
  onLegacy?: (userId: string) => void,
): HandshakeIdentity {
  const credential = raw?.trim();
  if (credential && looksLikeJwt(credential)) {
    try {
      const claims = tokens.verifySocket(credential);
      return {
        userId: claims.sub,
        tokenCompanyId:
          typeof claims.cid === 'string' && isUUID(claims.cid) ? claims.cid : null,
        mode: 'jwt',
      };
    } catch (e) {
      const reason = e instanceof JwtVerifyError ? e.reason : 'claims';
      throw new UnauthorizedException(
        reason === 'expired' ? 'Sesión expirada' : 'Token de autenticación inválido',
      );
    }
  }
  if (credential && isUUID(credential)) {
    if (!tokens.allowLegacyUuidBearer()) {
      throw new UnauthorizedException('Token de autenticación inválido o ausente');
    }
    onLegacy?.(credential);
    return { userId: credential, tokenCompanyId: null, mode: 'legacy' };
  }
  throw new UnauthorizedException('Token de autenticación inválido o ausente');
}
