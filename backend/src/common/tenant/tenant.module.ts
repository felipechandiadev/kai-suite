import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { MembershipsService } from '@modules/users/application/memberships.service';
import { TenantGuard } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      UserCompanyMembership,
      UserCompanyRole,
      UserCompanyPerson,
    ]),
  ],
  providers: [
    MembershipsService,
    TenantGuard,
    TenantInterceptor,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [TenantGuard, TenantInterceptor, MembershipsService],
})
export class TenantModule {}
