import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { SkipTenant } from '@common/tenant';
import { AuthServiceAdapter } from '@modules/auth/application/auth.service.adapter';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';
import { MembershipsService } from '@modules/users/application/memberships.service';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import { User } from '@modules/users/domain/user.entity';
import { LiteLoginDto } from '../application/dto/lite-login.dto';
import { LiteChangePasswordDto } from '../application/dto/lite-change-password.dto';
import { LiteCompanyResolver } from '../application/lite-company.resolver';

export type LiteAuthUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export type LiteLoginResponse = {
  accessToken: string;
  user: LiteAuthUser;
};

function mapLiteRoles(
  membershipRoles: string[],
  isOwner: boolean,
): string[] {
  const roles = new Set<string>();
  if (isOwner) roles.add('OWNER');

  for (const role of membershipRoles) {
    if (
      role === PlatformRoleCode.ADMIN ||
      role === PlatformRoleCode.SUB_ADMIN
    ) {
      roles.add('ADMIN');
    }
    if (role === PlatformRoleCode.POS_OPERATOR) {
      roles.add('CASHIER');
    }
    if (role === PlatformRoleCode.STOCK_OPERATOR) {
      roles.add('STOCK');
    }
  }

  if (roles.size === 0) {
    roles.add('ADMIN');
  }

  return [...roles];
}

function displayName(user: {
  userName: string;
  person?: { firstName?: string; lastName?: string | null };
}): string {
  const fromPerson = [user.person?.firstName, user.person?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fromPerson || user.userName;
}

@ApiTags('Lite')
@SkipTenant()
@Controller('lite/auth')
export class LiteAuthController {
  constructor(
    private readonly authService: AuthServiceAdapter,
    private readonly membershipsService: MembershipsService,
    private readonly companies: LiteCompanyResolver,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lite login',
    description:
      'Accepts email field as username or mail; returns Bearer UUID token for KaiStore Lite',
  })
  async login(
    @Body() body: LiteLoginDto,
    @Headers('x-active-company-id') companyHint?: string,
    @Headers('x-kai-app') kaiApp?: string,
  ): Promise<LiteLoginResponse> {
    const identifier = body.email.trim();
    let userName = identifier;

    const byUsername = await this.authRepository.findUserByUsername(identifier);
    if (!byUsername) {
      const byMail = await this.userRepo.findOne({
        where: { mail: identifier },
        relations: ['person'],
      });
      if (byMail) {
        userName = byMail.userName;
      }
    }

    let result;
    try {
      result = await this.authService.login(
        { userName, password: body.password },
        {
          companyHint: companyHint && isUUID(companyHint) ? companyHint : null,
          kaiApp: kaiApp?.trim() || null,
        },
      );
    } catch {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!result.user?.id) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const companyId =
      result.activeCompanyId ?? result.user.companyId ?? companyHint ?? null;

    const memberships = await this.membershipsService.getMemberships(
      result.user.id,
    );
    const activeMembership = companyId
      ? memberships.find((m) => m.companyId === companyId)
      : memberships[0];

    const roles = mapLiteRoles(
      activeMembership?.roles ?? [PlatformRoleCode.ADMIN],
      !!activeMembership?.isOwner,
    );

    return {
      accessToken: result.user.id,
      user: {
        id: result.user.id,
        name: displayName(result.user),
        email: result.user.email,
        roles,
      },
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lite change password (cierra sesión en el cliente)' })
  async changePassword(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: LiteChangePasswordDto,
  ) {
    const ctx = await this.companies.resolve(auth);
    return this.authService.changePassword(ctx.userId, dto);
  }
}
