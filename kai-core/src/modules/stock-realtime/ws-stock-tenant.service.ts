import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { MembershipsService } from '@modules/users/application/memberships.service';
import { AuthTokenService } from '@common/auth/auth-token.service';
import type { CurrentUserPayload } from '@common/tenant';
import { resolveWsTenant } from '@common/tenant/ws-tenant.resolver';

/** Handshake WS: JWT firmado (`auth.token`) o UUID legacy (`auth.userId`) según AUTH_ALLOW_LEGACY_UUID_BEARER. */
@Injectable()
export class WsStockTenantService {
  private readonly logger = new Logger(WsStockTenantService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly memberships: MembershipsService,
    private readonly tokens: AuthTokenService,
  ) {}

  resolveSocketTenant(params: {
    /** JWT firmado o, en modo legacy, el UUID del usuario. */
    userId: string | undefined;
    activeCompanyIdHeader: string | undefined;
  }): Promise<{ currentUser: CurrentUserPayload; activeCompanyId: string }> {
    return resolveWsTenant(
      {
        userRepository: this.userRepository,
        companyRepository: this.companyRepository,
        memberships: this.memberships,
        tokens: this.tokens,
        logger: this.logger,
        gateway: 'stock/notifications',
      },
      params,
    );
  }
}
