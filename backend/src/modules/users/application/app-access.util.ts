import { ForbiddenException } from '@nestjs/common';
import {
  KaiAppId,
  canAccessApp,
} from '../domain/platform-role.codes';

export const APP_HEADER = 'x-kai-app';

const KNOWN_APPS: KaiAppId[] = [
  'pwa-admin',
  'pwa-pos',
  'kai-delivery',
  'kai-waiter',
  'pwa-stock',
  'kds',
];

export function parseKaiAppHeader(value: unknown): KaiAppId | null {
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value[0]
        : null;
  if (!raw || typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase() as KaiAppId;
  return KNOWN_APPS.includes(v) ? v : null;
}

export function assertCanAccessAppOrThrow(
  app: KaiAppId,
  roles: string[],
  isSuperAdmin: boolean,
): void {
  if (!canAccessApp(app, roles, isSuperAdmin)) {
    throw new ForbiddenException(
      `Tu usuario no tiene acceso a la aplicación ${app}`,
    );
  }
}
