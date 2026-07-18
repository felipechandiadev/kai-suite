import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { LoginCommand } from '../../commands/login.command';
import { LoginEvent } from '../../../domain/events/login.event';
import { PasswordUpgradedEvent } from '../../../domain/events/password-upgraded.event';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';
import { Company } from '@modules/companies/domain/company.entity';
import { UserRole } from '@modules/users/domain/user.entity';
import { MembershipsService } from '@modules/users/application/memberships.service';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import {
  assertCanAccessAppOrThrow,
  parseKaiAppHeader,
} from '@modules/users/application/app-access.util';

export interface LoginCompanyOption {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
}

export interface LoginMembershipOption {
  companyId: string;
  roles: string[];
  isOwner: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    userName: string;
    email: string;
    rol: string;
    companyId: string | null;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  };
  activeCompanyId?: string | null;
  multiCompanyMode?: boolean;
  memberships?: LoginMembershipOption[];
  companies?: LoginCompanyOption[] | null;
}

@CommandHandler(LoginCommand)
export class LoginCommandHandler implements ICommandHandler<
  LoginCommand,
  LoginResult
> {
  private readonly logger = new Logger(LoginCommandHandler.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    private readonly eventBus: EventBus,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly membershipsService: MembershipsService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    this.logger.debug(`Login attempt for user: ${command.userName}`);

    const user = await this.authRepository.findUserByUsername(command.userName);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    let isValid = false;
    let passwordWasUpgraded = false;

    if (user.pass?.startsWith('$2')) {
      isValid = await bcrypt.compare(command.password, user.pass);
    } else if (user.pass) {
      const legacyHash = crypto
        .createHash('sha256')
        .update(command.password)
        .digest('hex');
      if (legacyHash === user.pass) {
        isValid = true;
        try {
          const upgradedHash = await bcrypt.hash(command.password, 12);
          user.pass = upgradedHash;
          await this.authRepository.saveUser(user);
          passwordWasUpgraded = true;
          this.logger.debug(`Password upgraded for user: ${user.id}`);
        } catch (upgradeError) {
          this.logger.error('Error upgrading password hash:', upgradeError);
        }
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.membershipsService.ensureMembershipFromLegacy(user);

    const loginEvent = new LoginEvent(user.id, user.userName, user.rol);
    loginEvent.aggregateId = user.id;
    loginEvent.aggregateVersion = 1;
    loginEvent.correlationId = user.id;
    this.eventBus.publish(loginEvent);

    if (passwordWasUpgraded) {
      const upgradeEvent = new PasswordUpgradedEvent(user.id);
      upgradeEvent.aggregateId = user.id;
      upgradeEvent.aggregateVersion = 2;
      upgradeEvent.correlationId = user.id;
      this.eventBus.publish(upgradeEvent);
    }

    const isSuper = user.rol === UserRole.SUPER_ADMIN;
    const memberships = isSuper
      ? []
      : await this.membershipsService.getMemberships(user.id);

    const hint =
      command.companyHint && isUUID(String(command.companyHint))
        ? String(command.companyHint)
        : null;
    const wantMulti = !!command.multiCompanyMode;

    const kaiAppEarly = parseKaiAppHeader(command.kaiApp);
    if (kaiAppEarly === 'pwa-admin' && !wantMulti && !hint) {
      throw new BadRequestException(
        'Debes elegir empresa o Multiempresa antes de iniciar sesión',
      );
    }

    let companies: LoginCompanyOption[] = [];
    if (isSuper) {
      const all = await this.companyRepository.find({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      companies = all.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        nombreFantasia: c.nombreFantasia ?? null,
      }));
    } else if (memberships.length) {
      const ids = memberships.map((m) => m.companyId);
      const rows = await this.companyRepository.find({
        where: { id: In(ids), isActive: true },
      });
      const byId = new Map(rows.map((c) => [c.id, c]));
      companies = memberships
        .map((m) => byId.get(m.companyId))
        .filter((c): c is Company => !!c)
        .map((c) => ({
          id: c.id,
          razonSocial: c.razonSocial,
          nombreFantasia: c.nombreFantasia ?? null,
        }));
    }

    const canMulti =
      isSuper ||
      (memberships.length >= 2 &&
        memberships.some((m) => m.roles.includes(PlatformRoleCode.ADMIN)));

    let multiCompanyMode = false;
    let activeCompanyId: string | null = null;

    if (wantMulti) {
      if (!canMulti) {
        throw new ForbiddenException(
          'Este usuario no puede usar el modo Multiempresa',
        );
      }
      multiCompanyMode = true;
      activeCompanyId = null;
    } else if (hint) {
      const allowed = isSuper || memberships.some((m) => m.companyId === hint);
      if (!allowed) {
        throw new ForbiddenException(
          'Este usuario no pertenece a la empresa solicitada',
        );
      }
      const match = companies.find((c) => c.id === hint);
      if (!match) {
        throw new ForbiddenException(
          'La empresa solicitada no está disponible',
        );
      }
      activeCompanyId = hint;
    } else if (companies.length === 1) {
      activeCompanyId = companies[0].id;
    } else if (companies.length > 1) {
      // Prefer legacy companyId if still in list; else first.
      if (user.companyId && companies.some((c) => c.id === user.companyId)) {
        activeCompanyId = user.companyId;
      } else {
        activeCompanyId = companies[0].id;
      }
    } else if (isSuper) {
      activeCompanyId = null;
    }

    const kaiApp = kaiAppEarly;
    if (kaiApp) {
      const rolesForGate = isSuper
        ? [PlatformRoleCode.SUPER_ADMIN]
        : activeCompanyId
          ? (memberships.find((m) => m.companyId === activeCompanyId)?.roles ??
            [])
          : [...new Set(memberships.flatMap((m) => m.roles))];
      assertCanAccessAppOrThrow(kaiApp, rolesForGate, isSuper);
    }

    return {
      success: true,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.mail,
        rol: user.rol,
        companyId: user.companyId ?? null,
        person: user.person
          ? {
              id: user.person.id,
              firstName: user.person.firstName,
              lastName: user.person.lastName || '',
              email: user.person.email || null,
              phone: user.person.phone || null,
            }
          : undefined,
      },
      activeCompanyId,
      multiCompanyMode,
      memberships: memberships.map((m) => ({
        companyId: m.companyId,
        roles: m.roles,
        isOwner: m.isOwner,
      })),
      companies,
    };
  }
}
