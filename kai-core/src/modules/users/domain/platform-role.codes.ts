/**
 * Códigos de rol de plataforma (memberships + matriz app).
 * SUPER_ADMIN no vive en memberships de empresa.
 */
export enum PlatformRoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUB_ADMIN = 'SUB_ADMIN',
  POS_OPERATOR = 'POS_OPERATOR',
  COURIER = 'COURIER',
  WAITER = 'WAITER',
  STOCK_OPERATOR = 'STOCK_OPERATOR',
  KDS_OPERATOR = 'KDS_OPERATOR',
}

/** Roles que pueden vivir en user_company_roles. */
export const MEMBERSHIP_ROLE_CODES: PlatformRoleCode[] = [
  PlatformRoleCode.ADMIN,
  PlatformRoleCode.SUB_ADMIN,
  PlatformRoleCode.POS_OPERATOR,
  PlatformRoleCode.COURIER,
  PlatformRoleCode.WAITER,
  PlatformRoleCode.STOCK_OPERATOR,
  PlatformRoleCode.KDS_OPERATOR,
];

export const GOVERNANCE_ROLE_CODES: PlatformRoleCode[] = [
  PlatformRoleCode.SUPER_ADMIN,
  PlatformRoleCode.ADMIN,
  PlatformRoleCode.SUB_ADMIN,
];

export type KaiAppId =
  | 'kai-admin'
  | 'kai-pos'
  | 'kai-delivery'
  | 'kai-waiter'
  | 'kai-stock'
  | 'kds';

export const APP_ROLE_MATRIX: Record<KaiAppId, PlatformRoleCode[]> = {
  'kai-admin': [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
  ],
  'kai-pos': [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
    PlatformRoleCode.POS_OPERATOR,
  ],
  'kai-delivery': [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
    PlatformRoleCode.COURIER,
  ],
  'kai-waiter': [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
    PlatformRoleCode.WAITER,
  ],
  'kai-stock': [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
    PlatformRoleCode.STOCK_OPERATOR,
  ],
  kds: [
    PlatformRoleCode.SUPER_ADMIN,
    PlatformRoleCode.ADMIN,
    PlatformRoleCode.SUB_ADMIN,
    PlatformRoleCode.KDS_OPERATOR,
  ],
};

/** Map legacy users.rol → membership role. */
export function legacyUserRoleToMembershipRole(
  rol: string,
): PlatformRoleCode | null {
  switch (rol) {
    case 'SUPER_ADMIN':
      return null;
    case 'ADMIN':
      return PlatformRoleCode.ADMIN;
    case 'OPERATOR':
    case 'POS_OPERATOR':
      return PlatformRoleCode.POS_OPERATOR;
    case 'COURIER':
      return PlatformRoleCode.COURIER;
    case 'SUB_ADMIN':
      return PlatformRoleCode.SUB_ADMIN;
    case 'WAITER':
      return PlatformRoleCode.WAITER;
    case 'STOCK_OPERATOR':
      return PlatformRoleCode.STOCK_OPERATOR;
    case 'KDS_OPERATOR':
      return PlatformRoleCode.KDS_OPERATOR;
    default:
      return PlatformRoleCode.POS_OPERATOR;
  }
}

/** Primary legacy column value when dual-writing from membership roles. */
export function primaryLegacyRoleFromMembershipRoles(
  roles: string[],
): string {
  const set = new Set(roles);
  if (set.has(PlatformRoleCode.ADMIN)) return 'ADMIN';
  if (set.has(PlatformRoleCode.SUB_ADMIN)) return 'SUB_ADMIN';
  if (set.has(PlatformRoleCode.POS_OPERATOR)) return 'OPERATOR';
  if (set.has(PlatformRoleCode.COURIER)) return 'COURIER';
  if (set.has(PlatformRoleCode.WAITER)) return 'WAITER';
  if (set.has(PlatformRoleCode.STOCK_OPERATOR)) return 'STOCK_OPERATOR';
  if (set.has(PlatformRoleCode.KDS_OPERATOR)) return 'KDS_OPERATOR';
  return 'OPERATOR';
}

export function isGovernanceRole(role: string): boolean {
  return (
    role === PlatformRoleCode.SUPER_ADMIN ||
    role === PlatformRoleCode.ADMIN ||
    role === PlatformRoleCode.SUB_ADMIN
  );
}

export function canAccessApp(
  app: KaiAppId,
  roles: string[],
  isPlatformSuperAdmin: boolean,
): boolean {
  if (isPlatformSuperAdmin) return true;
  const allowed = APP_ROLE_MATRIX[app];
  return roles.some((r) => allowed.includes(r as PlatformRoleCode));
}
