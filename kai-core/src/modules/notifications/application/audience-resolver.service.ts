import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User, UserRole } from '@modules/users/domain/user.entity';
import {
  NotificationAudienceType,
  NotificationDomain,
} from '../domain/notification.enums';
import type { NotificationAudienceSpec } from './dto/publish-notification.command';

@Injectable()
export class AudienceResolverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async resolveUserIds(
    companyId: string,
    audiences: NotificationAudienceSpec[],
    domain: NotificationDomain,
  ): Promise<string[]> {
    const ids = new Set<string>();
    for (const spec of audiences) {
      const resolved = await this.resolveOne(companyId, spec, domain);
      for (const id of resolved) {
        ids.add(id);
      }
    }
    return [...ids];
  }

  private async resolveOne(
    companyId: string,
    spec: NotificationAudienceSpec,
    domain: NotificationDomain,
  ): Promise<string[]> {
    switch (spec.audienceType) {
      case NotificationAudienceType.ALL_COMPANY:
        return this.usersForCompany(companyId);
      case NotificationAudienceType.ROLES: {
        const roles = (spec.audienceConfig?.roles as string[] | undefined) ?? [];
        return this.usersForCompanyAndRoles(companyId, roles);
      }
      case NotificationAudienceType.USER_IDS: {
        const userIds = (spec.audienceConfig?.userIds as string[] | undefined) ?? [];
        return userIds.filter(Boolean);
      }
      default:
        if (domain === NotificationDomain.STOCK) {
          return this.usersForCompanyAndRoles(companyId, [UserRole.ADMIN]);
        }
        return [];
    }
  }

  private async usersForCompany(companyId: string): Promise<string[]> {
    const rows = await this.userRepository.find({
      where: { companyId, deletedAt: IsNull() },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async usersForCompanyAndRoles(
    companyId: string,
    roles: string[],
  ): Promise<string[]> {
    const effectiveRoles =
      roles.length > 0 ? roles : [UserRole.ADMIN];
    const rows = await this.userRepository.find({
      where: {
        companyId,
        rol: In(effectiveRoles as UserRole[]),
        deletedAt: IsNull(),
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Default stock audience: company admins. */
  stockDefaultAudiences(): NotificationAudienceSpec[] {
    return [
      {
        audienceType: NotificationAudienceType.ROLES,
        audienceConfig: { roles: [UserRole.ADMIN] },
      },
    ];
  }
}
