import {
  canAccessApp,
  legacyUserRoleToMembershipRole,
  primaryLegacyRoleFromMembershipRoles,
  PlatformRoleCode,
} from '../../domain/platform-role.codes';

describe('platform-role.codes', () => {
  it('maps OPERATOR to POS_OPERATOR', () => {
    expect(legacyUserRoleToMembershipRole('OPERATOR')).toBe(
      PlatformRoleCode.POS_OPERATOR,
    );
  });

  it('SUPER_ADMIN has no membership role', () => {
    expect(legacyUserRoleToMembershipRole('SUPER_ADMIN')).toBeNull();
  });

  it('picks primary legacy role ADMIN over POS', () => {
    expect(
      primaryLegacyRoleFromMembershipRoles([
        PlatformRoleCode.POS_OPERATOR,
        PlatformRoleCode.ADMIN,
      ]),
    ).toBe('ADMIN');
  });

  it('canAccessApp for POS', () => {
    expect(
      canAccessApp('pwa-pos', [PlatformRoleCode.POS_OPERATOR], false),
    ).toBe(true);
    expect(canAccessApp('pwa-pos', [PlatformRoleCode.COURIER], false)).toBe(
      false,
    );
    expect(canAccessApp('pwa-admin', [PlatformRoleCode.ADMIN], false)).toBe(
      true,
    );
  });
});
