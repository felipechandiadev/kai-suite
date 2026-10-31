import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { parseDurationSeconds, signJwt, verifyJwt } from './jwt-hs256';

export type AccessTokenClaims = {
  sub: string;
  cid: string | null;
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
};

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

/**
 * Emite y valida tokens firmados (HS256).
 * - access: JWT_SECRET, JWT_ACCESS_EXPIRES_IN (def. 15m)
 * - refresh: JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN (def. 7d)
 * - AUTH_ALLOW_LEGACY_UUID_BEARER: acepta `Bearer <userId>` (def. false en production, true en otros).
 */
@Injectable()
export class AuthTokenService {
  constructor(private readonly config: ConfigService) {}

  private read(key: string): string | undefined {
    const v = this.config.get<string>(key) ?? process.env[key];
    return v === undefined || v === null ? undefined : String(v);
  }

  private secret(): string {
    const s = this.read('JWT_SECRET');
    if (!s) throw new Error('JWT_SECRET no configurado');
    return s;
  }

  private refreshSecret(): string {
    const s = this.read('JWT_REFRESH_SECRET');
    if (!s) throw new Error('JWT_REFRESH_SECRET no configurado');
    return s;
  }

  get accessTtlSeconds(): number {
    return parseDurationSeconds(this.read('JWT_ACCESS_EXPIRES_IN'), 15 * 60);
  }

  get refreshTtlSeconds(): number {
    return parseDurationSeconds(this.read('JWT_REFRESH_EXPIRES_IN'), 7 * 86400);
  }

  /** Modo compatibilidad para el bearer UUID antiguo. */
  allowLegacyUuidBearer(): boolean {
    const raw = this.read('AUTH_ALLOW_LEGACY_UUID_BEARER')?.trim().toLowerCase();
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return this.read('NODE_ENV') !== 'production';
  }

  issue(userId: string, companyId: string | null): IssuedTokens {
    const cid = companyId && isUUID(companyId) ? companyId : null;
    return {
      accessToken: signJwt(
        { sub: userId, cid, typ: 'access' },
        this.secret(),
        this.accessTtlSeconds,
      ),
      refreshToken: signJwt(
        { sub: userId, cid, typ: 'refresh' },
        this.refreshSecret(),
        this.refreshTtlSeconds,
      ),
      expiresIn: this.accessTtlSeconds,
      refreshExpiresIn: this.refreshTtlSeconds,
    };
  }

  verifyAccess(token: string): AccessTokenClaims {
    return this.check(verifyJwt<AccessTokenClaims>(token, this.secret()), 'access');
  }

  verifyRefresh(token: string): AccessTokenClaims {
    return this.check(
      verifyJwt<AccessTokenClaims>(token, this.refreshSecret()),
      'refresh',
    );
  }

  private check(c: AccessTokenClaims, typ: 'access' | 'refresh'): AccessTokenClaims {
    if (c.typ !== typ || typeof c.sub !== 'string' || !isUUID(c.sub)) {
      throw new Error('Claims de token inválidos');
    }
    return c;
  }
}
