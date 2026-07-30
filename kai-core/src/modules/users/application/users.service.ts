import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../domain/user.entity';
import {
  DocumentType,
  Person,
  PersonType,
} from '@modules/persons/domain/person.entity';
import {
  Employee,
  EmploymentType,
} from '@modules/employees/domain/employee.entity';
import { PersonsService } from '@modules/persons/application/persons.service';
import { MembershipsService } from './memberships.service';
import {
  PlatformRoleCode,
  primaryLegacyRoleFromMembershipRoles,
} from '../domain/platform-role.codes';
import type { CurrentUserPayload } from '@common/tenant';
import type {
  AlsoAsEmployeeDto,
  CreateUserPersonDto,
  UserMembershipInputDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly personsService: PersonsService,
    private readonly membershipsService: MembershipsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lista los usuarios visibles para la empresa activa.
   * - Excluye SUPER_ADMIN (gestionados en sección aparte).
   * - Filtra por membership en activeCompanyId (dual-read: también companyId legacy).
   */
  async getAllUsers(search?: string, activeCompanyId?: string | null) {
    // Alias "u" (no "user"): en SQL crudo EXISTS, `user` es palabra reservada en Postgres.
    const query = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.person', 'person')
      .where('u.rol != :superRole', { superRole: UserRole.SUPER_ADMIN });

    if (activeCompanyId) {
      query.andWhere(
        `(
          u.companyId = :companyId
          OR EXISTS (
            SELECT 1 FROM user_company_memberships m
            WHERE m.user_id = u.id
              AND m.company_id = :companyId
              AND m.is_active = true
          )
        )`,
        { companyId: activeCompanyId },
      );
    }

    if (search && search.trim().length > 0) {
      const q = `%${search.trim().toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(u.userName) LIKE :q OR
          LOWER(u.mail) LIKE :q OR
          LOWER(person.firstName) LIKE :q OR
          LOWER(person.lastName) LIKE :q OR
          LOWER(person.businessName) LIKE :q OR
          LOWER(person.documentNumber) LIKE :q
        )`,
        { q },
      );
    }

    const users = await query.orderBy('u.userName', 'ASC').getMany();
    return Promise.all(users.map((user) => this.mapUserAsync(user)));
  }

  /**
   * Lista exclusivamente a los super-administradores del deploy.
   * No depende de empresa activa (son globales).
   */
  async listSuperAdmins(): Promise<ReturnType<UsersService['mapUser']>[]> {
    const users = await this.userRepository.find({
      where: { rol: UserRole.SUPER_ADMIN },
      relations: ['person'],
      order: { userName: 'ASC' },
    });
    return users.map((user) => this.mapUser(user));
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });

    if (!user) {
      return null;
    }

    return this.mapUserAsync(user);
  }

  async createUser(
    data: {
      userName: string;
      mail: string;
      password: string;
      rol?: UserRole | string;
      companyId?: string | null;
      nonDeletable?: boolean;
      personId?: string;
      person?: CreateUserPersonDto;
      alsoAsEmployee?: AlsoAsEmployeeDto;
      memberships?: UserMembershipInputDto[];
    },
    activeCompanyId?: string | null,
    actor?: CurrentUserPayload | null,
  ) {
    const membershipsInput = data.memberships?.length
      ? data.memberships
      : null;

    let rol = (data.rol as UserRole) ?? UserRole.OPERATOR;
    let companyId: string | null;

    if (membershipsInput) {
      await this.assertActorCanAssignMemberships(actor, membershipsInput);
      companyId = membershipsInput[0].companyId;
      rol = primaryLegacyRoleFromMembershipRoles(
        membershipsInput[0].roles,
      ) as UserRole;
    } else if (rol === UserRole.SUPER_ADMIN) {
      companyId = null;
    } else {
      const resolved = data.companyId ?? activeCompanyId ?? null;
      if (!resolved) {
        throw new ForbiddenException(
          `Para crear un usuario ${rol} se requiere una empresa activa`,
        );
      }
      companyId = resolved;
      await this.assertActorCanAssignMemberships(actor, [
        {
          companyId: resolved,
          roles: [this.legacyRolToMembershipRole(rol)],
          isOwner: false,
        },
      ]);
    }

    if (rol !== UserRole.SUPER_ADMIN && !data.personId && !data.person) {
      throw new BadRequestException(
        'Los usuarios de plataforma deben asociar una persona natural (personId o person).',
      );
    }
    if (data.personId && data.person) {
      throw new BadRequestException(
        'Envíe solo personId o los datos de person, no ambos.',
      );
    }

    let resolvedPersonId: string | null = null;

    if (data.personId) {
      const existingPerson = await this.personRepository.findOne({
        where: { id: data.personId },
      });
      if (!existingPerson || existingPerson.deletedAt) {
        throw new BadRequestException('La persona indicada no existe.');
      }
      if (existingPerson.type !== PersonType.NATURAL) {
        throw new BadRequestException(
          'El usuario de plataforma solo puede asociarse a una persona natural.',
        );
      }
      if (
        companyId &&
        existingPerson.companyId &&
        existingPerson.companyId !== companyId
      ) {
        throw new BadRequestException(
          'La persona no pertenece a la empresa activa.',
        );
      }
      resolvedPersonId = existingPerson.id;
    } else if (data.person) {
      if (!data.person.documentNumber?.trim()) {
        throw new BadRequestException(
          'El número de documento es obligatorio para la persona del usuario.',
        );
      }
      const created = await this.personsService.create({
        type: PersonType.NATURAL,
        firstName: data.person.firstName,
        lastName: data.person.lastName,
        documentType: data.person.documentType ?? DocumentType.RUT,
        documentNumber: data.person.documentNumber,
        email: data.person.email,
        phone: data.person.phone,
        address: data.person.address,
      });
      resolvedPersonId = created.id;
    }

    const tx = await this.dataSource.transaction(async (manager) => {
      const personRepo = manager.getRepository(Person);
      const userRepo = manager.getRepository(User);
      const employeeRepo = manager.getRepository(Employee);

      let person: Person | null = null;
      if (resolvedPersonId) {
        person = await personRepo.findOne({ where: { id: resolvedPersonId } });
        if (!person) {
          throw new BadRequestException('La persona indicada no existe.');
        }

        const existingUser = await userRepo
          .createQueryBuilder('u')
          .leftJoin('u.person', 'p')
          .where('p.id = :personId', { personId: person.id })
          .andWhere('u.deletedAt IS NULL')
          .getOne();
        if (existingUser) {
          throw new ConflictException(
            'Ya existe un usuario de plataforma asociado a esta persona.',
          );
        }
      }

      const user = userRepo.create({
        userName: data.userName,
        mail: data.mail,
        pass: this.hashPassword(data.password),
        rol,
        companyId,
        nonDeletable: rol === UserRole.SUPER_ADMIN ? !!data.nonDeletable : false,
        person: person ?? undefined,
      } as DeepPartial<User>);

      const saved = await userRepo.save(user);

      let employee: Employee | null = null;
      if (data.alsoAsEmployee) {
        if (!person) {
          throw new BadRequestException(
            'alsoAsEmployee requiere una persona asociada al usuario.',
          );
        }
        if (!companyId) {
          throw new BadRequestException(
            'alsoAsEmployee no aplica a SUPER_ADMIN.',
          );
        }
        const existingEmp = await employeeRepo.findOne({
          where: { personId: person.id, deletedAt: IsNull() },
        });
        if (existingEmp) {
          throw new ConflictException(
            'Ya existe un empleado asociado a esta persona.',
          );
        }
        employee = employeeRepo.create({
          personId: person.id,
          companyId,
          branchId: data.alsoAsEmployee.branchId ?? null,
          employmentType:
            data.alsoAsEmployee.employmentType ?? EmploymentType.FULL_TIME,
          hireDate: data.alsoAsEmployee.hireDate,
          baseSalary: data.alsoAsEmployee.baseSalary ?? null,
        });
        employee = await employeeRepo.save(employee);
      }

      const created = await userRepo.findOne({
        where: { id: saved.id },
        relations: ['person'],
      });

      return {
        success: true as const,
        userEntity: created,
        employee: employee
          ? { id: employee.id, personId: employee.personId }
          : undefined,
        membershipsInput,
        companyId,
        rol,
        person,
      };
    });

    if (
      tx.userEntity &&
      tx.rol !== UserRole.SUPER_ADMIN &&
      tx.companyId
    ) {
      const items =
        tx.membershipsInput ??
        [
          {
            companyId: tx.companyId,
            roles: [this.legacyRolToMembershipRole(tx.rol)],
            isOwner: false,
          },
        ];
      await this.membershipsService.replaceMemberships(
        tx.userEntity.id,
        await Promise.all(
          items.map(async (i) => {
            let isOwner = false;
            if (i.roles.includes(PlatformRoleCode.ADMIN)) {
              const ownerCount = await this.dataSource.query(
                `SELECT COUNT(*)::int AS c FROM user_company_memberships
                 WHERE company_id = $1 AND is_owner = true AND is_active = true`,
                [i.companyId],
              );
              // Primer ADMIN de la empresa (sin owner) pasa a ser dueño.
              isOwner = Number(ownerCount?.[0]?.c ?? 0) === 0;
            }
            return {
              companyId: i.companyId,
              roles: i.roles,
              isOwner,
            };
          }),
        ),
      );
      if (tx.person) {
        await this.membershipsService.linkUserPerson(
          tx.userEntity.id,
          tx.companyId,
          tx.person.id,
        );
        for (const item of items.slice(1)) {
          const mirror = await this.ensurePersonInCompany(
            tx.person,
            item.companyId,
          );
          await this.membershipsService.linkUserPerson(
            tx.userEntity.id,
            item.companyId,
            mirror.id,
          );
        }
      }
    }

    const mapped = tx.userEntity
      ? await this.mapUserAsync(tx.userEntity)
      : null;

    return {
      success: true,
      user: mapped,
      employee: tx.employee,
    };
  }

  async updateUser(
    id: string,
    data: Partial<{
      userName: string;
      mail: string;
      rol: UserRole | string;
      phone?: string;
      personName?: string;
      personDni?: string;
      personId?: string;
      memberships?: UserMembershipInputDto[];
    }>,
    actor?: CurrentUserPayload | null,
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    await this.assertActorCanManageTarget(actor, user);

    if (data.userName) {
      user.userName = data.userName;
    }
    if (data.mail) {
      user.mail = data.mail;
    }
    if (data.rol) {
      user.rol = data.rol as UserRole;
    }

    if (data.memberships?.length) {
      await this.assertActorCanAssignMemberships(actor, data.memberships);
      const existing = await this.membershipsService.getMemberships(user.id);
      const ownerByCompany = new Map(
        existing.map((m) => [m.companyId, m.isOwner] as const),
      );
      await this.membershipsService.replaceMemberships(
        user.id,
        data.memberships.map((m) => ({
          companyId: m.companyId,
          roles: m.roles,
          isOwner:
            m.isOwner === true ||
            (ownerByCompany.get(m.companyId) === true &&
              m.roles.includes(PlatformRoleCode.ADMIN)),
        })),
      );
      if (user.person) {
        for (const m of data.memberships) {
          const mirror = await this.ensurePersonInCompany(
            user.person,
            m.companyId,
          );
          await this.membershipsService.linkUserPerson(
            user.id,
            m.companyId,
            mirror.id,
          );
        }
      }
    }

    if (data.personId && !user.person) {
      const person = await this.personRepository.findOne({
        where: { id: data.personId },
      });
      if (!person || person.deletedAt) {
        throw new BadRequestException('La persona indicada no existe.');
      }
      if (person.type !== PersonType.NATURAL) {
        throw new BadRequestException(
          'El usuario de plataforma solo puede asociarse a una persona natural.',
        );
      }
      const existingUser = await this.userRepository
        .createQueryBuilder('u')
        .leftJoin('u.person', 'p')
        .where('p.id = :personId', { personId: person.id })
        .andWhere('u.deletedAt IS NULL')
        .andWhere('u.id != :id', { id })
        .getOne();
      if (existingUser) {
        throw new ConflictException(
          'Ya existe un usuario de plataforma asociado a esta persona.',
        );
      }
      user.person = person;
    }

    if (user.person) {
      if (data.phone !== undefined) {
        user.person.phone = data.phone || undefined;
      }
      if (data.personDni !== undefined) {
        user.person.documentNumber = data.personDni || undefined;
      }
      if (data.personName !== undefined) {
        const parsed = this.splitName(data.personName);
        user.person.firstName = parsed.firstName;
        user.person.lastName = parsed.lastName ?? undefined;
      }
      await this.personRepository.save(user.person);
    }

    await this.userRepository.save(user);
    const updated = await this.getUserById(id);

    if (!updated) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return { success: true, user: updated };
  }

  /**
   * Soft-delete con protecciones:
   * - No permite auto-eliminarse.
   * - No permite eliminar usuarios `nonDeletable` (el SUPER_ADMIN del seed).
   * - Solo un SUPER_ADMIN puede eliminar a otro SUPER_ADMIN.
   * - Peer-ADMIN: solo owner puede eliminar ADMINs (no el último owner).
   */
  async deleteUser(id: string, currentUser?: CurrentUserPayload | null) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    if (currentUser?.id === user.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    if (user.nonDeletable) {
      throw new ForbiddenException(
        'Este usuario es protegido y no puede eliminarse',
      );
    }
    if (
      user.rol === UserRole.SUPER_ADMIN &&
      currentUser?.rol !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo un super-administrador puede eliminar a otro super-administrador',
      );
    }

    await this.assertActorCanManageTarget(currentUser, user);

    const targetMemberships = await this.membershipsService.getMemberships(
      user.id,
    );
    for (const m of targetMemberships) {
      if (m.isOwner) {
        throw new ForbiddenException(
          'No se puede eliminar al dueño de una empresa. Transfiere la propiedad primero.',
        );
      }
    }

    const result = await this.userRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    return { success: true };
  }

  async transferOwnership(
    companyId: string,
    toUserId: string,
    actor?: CurrentUserPayload | null,
  ) {
    if (!actor) {
      throw new ForbiddenException('No autenticado');
    }

    let fromUserId: string = actor.id;
    if (actor.rol === UserRole.SUPER_ADMIN) {
      const rows = await this.dataSource.query(
        `SELECT user_id FROM user_company_memberships
         WHERE company_id = $1 AND is_owner = true AND is_active = true
         LIMIT 1`,
        [companyId],
      );
      const ownerId = rows?.[0]?.user_id as string | undefined;
      if (!ownerId) {
        throw new BadRequestException(
          'No hay dueño actual en esa empresa',
        );
      }
      fromUserId = ownerId;
    } else {
      const isOwner = await this.membershipsService.isOwner(
        actor.id,
        companyId,
      );
      if (!isOwner) {
        throw new ForbiddenException(
          'Solo el dueño puede transferir la propiedad',
        );
      }
    }

    await this.membershipsService.transferOwnership(
      companyId,
      fromUserId,
      toUserId,
    );
    return { success: true };
  }

  async changePassword(userId: string, password: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    user.pass = this.hashPassword(password);
    await this.userRepository.save(user);
    return { success: true };
  }

  async changeOwnPassword(payload: {
    currentUserId?: string;
    newPassword?: string;
  }) {
    if (!payload.currentUserId || !payload.newPassword) {
      return {
        success: false,
        message: 'Missing user or password',
        statusCode: 400,
      };
    }
    return this.changePassword(payload.currentUserId, payload.newPassword);
  }

  private legacyRolToMembershipRole(rol: string): string {
    if (rol === UserRole.OPERATOR || rol === 'OPERATOR') {
      return PlatformRoleCode.POS_OPERATOR;
    }
    if (rol === UserRole.POS_OPERATOR) return PlatformRoleCode.POS_OPERATOR;
    return rol;
  }

  private async assertActorCanAssignMemberships(
    actor: CurrentUserPayload | null | undefined,
    items: UserMembershipInputDto[],
  ) {
    if (!actor) return;
    if (actor.rol === UserRole.SUPER_ADMIN) return;

    const actorMemberships =
      actor.memberships ??
      (await this.membershipsService.getMemberships(actor.id));

    for (const item of items) {
      const actorMem = actorMemberships.find(
        (m) => m.companyId === item.companyId,
      );
      if (!actorMem) {
        throw new ForbiddenException(
          'Solo puedes asignar empresas que administras',
        );
      }
      const assignsAdmin = item.roles.includes(PlatformRoleCode.ADMIN);
      if (assignsAdmin && !actorMem.isOwner) {
        throw new ForbiddenException(
          'Solo el dueño puede crear o asignar rol ADMIN',
        );
      }
      if (
        item.roles.includes(PlatformRoleCode.SUB_ADMIN) &&
        actor.rol === UserRole.SUB_ADMIN
      ) {
        throw new ForbiddenException(
          'SUB_ADMIN no puede crear otros SUB_ADMIN',
        );
      }
    }
  }

  private async assertActorCanManageTarget(
    actor: CurrentUserPayload | null | undefined,
    target: User,
  ) {
    if (!actor) return;
    if (actor.rol === UserRole.SUPER_ADMIN) return;
    if (target.rol === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('No puedes gestionar SUPER_ADMIN');
    }

    const targetMemberships = await this.membershipsService.getMemberships(
      target.id,
    );
    const actorMemberships =
      actor.memberships ??
      (await this.membershipsService.getMemberships(actor.id));

    const targetIsAdmin = targetMemberships.some((m) =>
      m.roles.includes(PlatformRoleCode.ADMIN),
    );
    if (!targetIsAdmin && target.rol !== UserRole.ADMIN) return;

    // Managing an ADMIN: actor must be owner in a shared company
    const shared = targetMemberships.filter((tm) =>
      actorMemberships.some((am) => am.companyId === tm.companyId),
    );
    const can = shared.some((tm) => {
      const am = actorMemberships.find((x) => x.companyId === tm.companyId);
      return am?.isOwner;
    });
    if (!can) {
      throw new ForbiddenException(
        'Solo el dueño puede editar o eliminar a un ADMIN',
      );
    }
  }

  private async ensurePersonInCompany(
    source: Person,
    companyId: string,
  ): Promise<Person> {
    if (source.companyId === companyId) return source;
    const existing = await this.personsService.findActiveByNormalizedDocument(
      source.documentNumber,
      companyId,
    );
    if (existing) return existing;

    const person = this.personRepository.create({
      type: PersonType.NATURAL,
      firstName: source.firstName,
      lastName: source.lastName,
      documentType: source.documentType ?? DocumentType.RUT,
      documentNumber: source.documentNumber,
      email: source.email,
      phone: source.phone,
      address: source.address,
      companyId,
    });
    return this.personRepository.save(person);
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, 12);
  }

  private splitName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { firstName: '', lastName: undefined as string | undefined };
    }
    const [firstName, ...rest] = trimmed.split(' ');
    return {
      firstName,
      lastName: rest.length > 0 ? rest.join(' ') : undefined,
    };
  }

  private buildPersonName(person: Person) {
    const parts = [person.firstName, person.lastName].filter(
      (value) => value && value.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ').trim();
    }
    return person.businessName || person.firstName || 'Sin nombre';
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      userName: user.userName,
      mail: user.mail,
      rol: user.rol,
      companyId: user.companyId ?? null,
      nonDeletable: !!user.nonDeletable,
      personId: user.person?.id ?? null,
      person: user.person
        ? {
            id: user.person.id,
            name: this.buildPersonName(user.person),
            firstName: user.person.firstName,
            lastName: user.person.lastName ?? undefined,
            email: user.person.email ?? undefined,
            dni: user.person.documentNumber ?? undefined,
            documentType: user.person.documentType ?? undefined,
            documentNumber: user.person.documentNumber ?? undefined,
            phone: user.person.phone ?? undefined,
            type: user.person.type,
          }
        : undefined,
    };
  }

  private async mapUserAsync(user: User) {
    const base = this.mapUser(user);
    const memberships = await this.membershipsService.getMemberships(user.id);
    return {
      ...base,
      memberships,
      isOwner: memberships.some((m) => m.isOwner),
    };
  }
}
