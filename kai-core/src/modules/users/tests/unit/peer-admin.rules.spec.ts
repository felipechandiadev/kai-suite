import { PlatformRoleCode } from '../../domain/platform-role.codes';

/**
 * Reglas peer-ADMIN (§5.3) — lógica pura testeable sin DB.
 */
export function canActorManageAdminPeer(params: {
  actorIsSuperAdmin: boolean;
  actorIsOwnerInSharedCompany: boolean;
  targetHasAdminRole: boolean;
}): boolean {
  if (params.actorIsSuperAdmin) return true;
  if (!params.targetHasAdminRole) return true;
  return params.actorIsOwnerInSharedCompany;
}

export function canActorAssignAdminRole(params: {
  actorIsSuperAdmin: boolean;
  actorIsOwnerInCompany: boolean;
}): boolean {
  if (params.actorIsSuperAdmin) return true;
  return params.actorIsOwnerInCompany;
}

describe('peer-ADMIN authorization rules', () => {
  it('owner can manage peer ADMIN', () => {
    expect(
      canActorManageAdminPeer({
        actorIsSuperAdmin: false,
        actorIsOwnerInSharedCompany: true,
        targetHasAdminRole: true,
      }),
    ).toBe(true);
  });

  it('non-owner cannot manage peer ADMIN', () => {
    expect(
      canActorManageAdminPeer({
        actorIsSuperAdmin: false,
        actorIsOwnerInSharedCompany: false,
        targetHasAdminRole: true,
      }),
    ).toBe(false);
  });

  it('non-owner can manage operatives', () => {
    expect(
      canActorManageAdminPeer({
        actorIsSuperAdmin: false,
        actorIsOwnerInSharedCompany: false,
        targetHasAdminRole: false,
      }),
    ).toBe(true);
  });

  it('only owner assigns ADMIN', () => {
    expect(
      canActorAssignAdminRole({
        actorIsSuperAdmin: false,
        actorIsOwnerInCompany: false,
      }),
    ).toBe(false);
    expect(
      canActorAssignAdminRole({
        actorIsSuperAdmin: false,
        actorIsOwnerInCompany: true,
      }),
    ).toBe(true);
  });

  it('ADMIN role code is distinct from POS_OPERATOR', () => {
    expect(PlatformRoleCode.ADMIN).not.toBe(PlatformRoleCode.POS_OPERATOR);
  });
});
