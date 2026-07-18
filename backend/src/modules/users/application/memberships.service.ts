import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../domain/user.entity';
import { UserCompanyMembership } from '../domain/user-company-membership.entity';
import { UserCompanyRole } from '../domain/user-company-role.entity';
import { UserCompanyPerson } from '../domain/user-company-person.entity';
import {
  KaiAppId,
  PlatformRoleCode,
  canAccessApp,
  legacyUserRoleToMembershipRole,
  primaryLegacyRoleFromMembershipRoles,
} from '../domain/platform-role.codes';

export type MembershipView = {
  id: string;
  companyId: string;
  roles: string[];
  isOwner: boolean;
  isActive: boolean;
};

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(UserCompanyMembership)
    private readonly membershipRepo: Repository<UserCompanyMembership>,
    @InjectRepository(UserCompanyRole)
    private readonly roleRepo: Repository<UserCompanyRole>,
    @InjectRepository(UserCompanyPerson)
    private readonly userCompanyPersonRepo: Repository<UserCompanyPerson>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getMemberships(userId: string): Promise<MembershipView[]> {
    const rows = await this.membershipRepo.find({
      where: { userId, isActive: true },
      relations: { roles: true },
      order: { createdAt: 'ASC' },
    });
    if (rows.length > 0) {
      return rows.map((m) => this.toView(m));
    }
    return this.legacyFallbackMemberships(userId);
  }

  async getMembership(
    userId: string,
    companyId: string,
  ): Promise<MembershipView | null> {
    const m = await this.membershipRepo.findOne({
      where: { userId, companyId, isActive: true },
      relations: { roles: true },
    });
    if (m) return this.toView(m);
    const legacy = await this.legacyFallbackMemberships(userId);
    return legacy.find((x) => x.companyId === companyId) ?? null;
  }

  async rolesFor(userId: string, companyId: string | null): Promise<string[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];
    if (user.rol === UserRole.SUPER_ADMIN) {
      return [PlatformRoleCode.SUPER_ADMIN];
    }
    if (!companyId) {
      const all = await this.getMemberships(userId);
      return [...new Set(all.flatMap((m) => m.roles))];
    }
    const m = await this.getMembership(userId, companyId);
    return m?.roles ?? [];
  }

  async isOwner(userId: string, companyId: string): Promise<boolean> {
    const m = await this.getMembership(userId, companyId);
    return !!m?.isOwner;
  }

  async hasRole(
    userId: string,
    companyId: string | null,
    role: string,
  ): Promise<boolean> {
    const roles = await this.rolesFor(userId, companyId);
    return roles.includes(role);
  }

  async isPlatformSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, rol: true },
    });
    return user?.rol === UserRole.SUPER_ADMIN;
  }

  async isGovernanceUser(
    userId: string,
    companyId: string | null,
  ): Promise<boolean> {
    if (await this.isPlatformSuperAdmin(userId)) return true;
    const roles = await this.rolesFor(userId, companyId);
    return roles.some(
      (r) =>
        r === PlatformRoleCode.ADMIN ||
        r === PlatformRoleCode.SUB_ADMIN ||
        r === PlatformRoleCode.SUPER_ADMIN,
    );
  }

  async canUserAccessApp(
    userId: string,
    app: KaiAppId,
    companyId: string | null,
  ): Promise<boolean> {
    if (await this.isPlatformSuperAdmin(userId)) return true;
    const roles = await this.rolesFor(userId, companyId);
    return canAccessApp(app, roles, false);
  }

  async canUseMultiCompanyMode(userId: string): Promise<boolean> {
    if (await this.isPlatformSuperAdmin(userId)) return true;
    const memberships = await this.getMemberships(userId);
    if (memberships.length < 2) return false;
    return memberships.some((m) =>
      m.roles.includes(PlatformRoleCode.ADMIN),
    );
  }

  /**
   * Dual-write: replace memberships for a user (non SUPER_ADMIN).
   * Ensures at most one owner per company when setting isOwner.
   */
  async replaceMemberships(
    userId: string,
    items: Array<{
      companyId: string;
      roles: string[];
      isOwner?: boolean;
    }>,
  ): Promise<MembershipView[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.rol === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'SUPER_ADMIN no tiene memberships de empresa',
      );
    }

    for (const item of items) {
      if (!item.roles?.length) {
        throw new BadRequestException(
          `Membership en empresa ${item.companyId} requiere al menos un rol`,
        );
      }
      if (item.isOwner && !item.roles.includes(PlatformRoleCode.ADMIN)) {
        throw new BadRequestException(
          'isOwner requiere rol ADMIN en esa empresa',
        );
      }
      if (
        item.roles.includes(PlatformRoleCode.SUB_ADMIN) &&
        items.length > 1
      ) {
        throw new BadRequestException(
          'SUB_ADMIN solo puede tener una empresa',
        );
      }
    }

    await this.membershipRepo.manager.transaction(async (em) => {
      const existing = await em.find(UserCompanyMembership, {
        where: { userId },
      });
      if (existing.length) {
        await em.delete(UserCompanyRole, {
          membershipId: In(existing.map((e) => e.id)),
        });
        await em.delete(UserCompanyMembership, { userId });
      }

      for (const item of items) {
        if (item.isOwner) {
          await em.update(
            UserCompanyMembership,
            { companyId: item.companyId, isOwner: true },
            { isOwner: false },
          );
        }
        const membership = em.create(UserCompanyMembership, {
          userId,
          companyId: item.companyId,
          isOwner: !!item.isOwner,
          isActive: true,
        });
        const saved = await em.save(membership);
        for (const role of [...new Set(item.roles)]) {
          await em.save(
            em.create(UserCompanyRole, {
              membershipId: saved.id,
              role,
            }),
          );
        }
      }
    });

    // Dual-write legacy columns from primary membership.
    const primary = items[0];
    if (primary) {
      user.companyId = primary.companyId;
      user.rol = primaryLegacyRoleFromMembershipRoles(
        primary.roles,
      ) as UserRole;
      await this.userRepo.save(user);
    }

    return this.getMemberships(userId);
  }

  async ensureMembershipFromLegacy(user: User): Promise<void> {
    if (user.rol === UserRole.SUPER_ADMIN || !user.companyId) return;
    const existing = await this.membershipRepo.findOne({
      where: { userId: user.id, companyId: user.companyId },
    });
    if (existing) return;
    const role = legacyUserRoleToMembershipRole(user.rol);
    if (!role) return;

    const ownerCount = await this.membershipRepo.count({
      where: { companyId: user.companyId, isOwner: true, isActive: true },
    });
    const isOwner =
      role === PlatformRoleCode.ADMIN && ownerCount === 0;

    const membership = await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: user.id,
        companyId: user.companyId,
        isOwner,
        isActive: true,
      }),
    );
    await this.roleRepo.save(
      this.roleRepo.create({
        membershipId: membership.id,
        role,
      }),
    );
  }

  async transferOwnership(
    companyId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    const from = await this.getMembership(fromUserId, companyId);
    if (!from?.isOwner) {
      throw new ForbiddenException(
        'Solo el dueño actual puede transferir la propiedad',
      );
    }
    const to = await this.getMembership(toUserId, companyId);
    if (!to || !to.roles.includes(PlatformRoleCode.ADMIN)) {
      throw new BadRequestException(
        'El destino debe ser ADMIN de la misma empresa',
      );
    }

    await this.membershipRepo.manager.transaction(async (em) => {
      await em.update(
        UserCompanyMembership,
        { userId: fromUserId, companyId },
        { isOwner: false },
      );
      await em.update(
        UserCompanyMembership,
        { userId: toUserId, companyId },
        { isOwner: true },
      );
    });
  }

  async linkUserPerson(
    userId: string,
    companyId: string,
    personId: string,
  ): Promise<void> {
    await this.userCompanyPersonRepo.upsert(
      {
        userId,
        companyId,
        personId,
      },
      ['userId', 'companyId'],
    );
  }

  async getPersonIdForCompany(
    userId: string,
    companyId: string,
  ): Promise<string | null> {
    const row = await this.userCompanyPersonRepo.findOne({
      where: { userId, companyId },
    });
    return row?.personId ?? null;
  }

  private toView(m: UserCompanyMembership): MembershipView {
    return {
      id: m.id,
      companyId: m.companyId,
      roles: (m.roles ?? []).map((r) => r.role),
      isOwner: m.isOwner,
      isActive: m.isActive,
    };
  }

  private async legacyFallbackMemberships(
    userId: string,
  ): Promise<MembershipView[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.rol === UserRole.SUPER_ADMIN || !user.companyId) {
      return [];
    }
    const role = legacyUserRoleToMembershipRole(user.rol);
    if (!role) return [];
    return [
      {
        id: `legacy:${user.id}`,
        companyId: user.companyId,
        roles: [role],
        isOwner: role === PlatformRoleCode.ADMIN,
        isActive: true,
      },
    ];
  }
}
