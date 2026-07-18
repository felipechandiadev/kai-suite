import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Person,
  PersonType,
  PersonBankAccount,
  DocumentType,
} from '../domain/person.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { User } from '@modules/users/domain/user.entity';
import { TenantContext } from '@common/tenant';
import { normalizePersonDocumentNumber } from './person-document.util';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonBankAccountDto } from './dto/person-bank-account.dto';
import { ListPersonsDto } from './dto/list-persons.dto';
import { sanitizePersonGeoActivityFields } from './person-geo-activity.util';
import type {
  PersonDocumentLookupResult,
  PersonDocumentRoles,
} from './person-by-document.types';

const DOCUMENT_NORM_SQL = `regexp_replace(lower(trim(coalesce(p.documentNumber, ''))), '[.[:space:]-]', '', 'g')`;

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personsRepository: Repository<Person>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Search persons with filters
   * @param term - Search term for firstName, lastName, businessName, documentNumber
   * @param limit - Maximum results to return
   * @param type - PersonType filter (NATURAL or COMPANY)
   */
  async findAll(params?: ListPersonsDto) {
    const { term, limit = 50, type, includeInactive = false } = params || {};

    const queryBuilder = this.personsRepository.createQueryBuilder('person');

    // Apply soft-delete filter
    if (!includeInactive) {
      queryBuilder.andWhere('person.deletedAt IS NULL');
    } else {
      queryBuilder.withDeleted();
    }

    // Apply PersonType filter
    if (type) {
      queryBuilder.andWhere('person.type = :type', { type });
    }

    // Apply search term filter
    if (term && term.trim()) {
      const searchTerm = `%${term.trim()}%`;
      queryBuilder.andWhere(
        '(person.firstName LIKE :searchTerm ' +
          'OR person.lastName LIKE :searchTerm ' +
          'OR person.businessName LIKE :searchTerm ' +
          'OR person.documentNumber LIKE :searchTerm)',
        { searchTerm },
      );
    }

    // Apply limit
    if (limit && limit > 0) {
      queryBuilder.limit(limit);
    }

    // Order by name
    queryBuilder.orderBy('person.firstName', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Find a person by ID
   */
  async findOne(id: string, includeInactive = false) {
    const queryBuilder = this.personsRepository
      .createQueryBuilder('person')
      .where('person.id = :id', { id });

    if (includeInactive) {
      queryBuilder.withDeleted();
    }

    const person = await queryBuilder.getOne();

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  /**
   * Lookup persona + roles por documentNumber normalizado, scoped a empresa activa.
   */
  async findByDocumentNumber(params: {
    documentNumber: string;
    documentType?: string;
    excludePersonId?: string;
  }): Promise<PersonDocumentLookupResult> {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere una empresa activa para consultar personas por documento.',
      );
    }

    const norm = normalizePersonDocumentNumber(params.documentNumber);
    if (!norm) {
      return { found: false };
    }

    const qb = this.personsRepository
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .andWhere('p.company_id = :companyId', { companyId })
      .andWhere(`${DOCUMENT_NORM_SQL} = :norm`, { norm });

    if (params.excludePersonId) {
      qb.andWhere('p.id != :excludePersonId', {
        excludePersonId: params.excludePersonId,
      });
    }

    const person = await qb.getOne();
    if (!person) {
      return { found: false };
    }

    const roles = await this.resolveRolesForPerson(person.id, companyId);

    return {
      found: true,
      person: {
        id: person.id,
        type: person.type,
        firstName: person.firstName,
        lastName: person.lastName ?? null,
        businessName: person.businessName ?? null,
        documentType: person.documentType ?? null,
        documentNumber: person.documentNumber ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        address: person.address ?? null,
        regionCode: person.regionCode ?? null,
        regionName: person.regionName ?? null,
        communeCode: person.communeCode ?? null,
        communeName: person.communeName ?? null,
        treasuryCode: person.treasuryCode ?? null,
        activityStarted: person.activityStarted ?? false,
        economicActivities: person.economicActivities ?? null,
      },
      roles,
    };
  }

  /**
   * Find active person by normalized document within company (for create reuse).
   */
  async findActiveByNormalizedDocument(
    documentNumber: string | null | undefined,
    companyId?: string | null,
  ): Promise<Person | null> {
    const norm = normalizePersonDocumentNumber(documentNumber);
    if (!norm) {
      return null;
    }
    const cid = companyId ?? TenantContext.getCompanyId();
    if (!cid) {
      return null;
    }

    return this.personsRepository
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .andWhere('p.company_id = :companyId', { companyId: cid })
      .andWhere(`${DOCUMENT_NORM_SQL} = :norm`, { norm })
      .getOne();
  }

  async resolveRolesForPerson(
    personId: string,
    companyId?: string | null,
  ): Promise<PersonDocumentRoles> {
    const cid = companyId ?? TenantContext.getCompanyId();

    const [customer, supplier, employee, user] = await Promise.all([
      this.customersRepository.findOne({
        where: {
          personId,
          ...(cid ? { companyId: cid } : {}),
          deletedAt: IsNull(),
        },
      }),
      this.suppliersRepository.findOne({
        where: {
          personId,
          ...(cid ? { companyId: cid } : {}),
          deletedAt: IsNull(),
        },
      }),
      this.employeesRepository.findOne({
        where: {
          personId,
          ...(cid ? { companyId: cid } : {}),
          deletedAt: IsNull(),
        },
      }),
      this.usersRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.person', 'person')
        .where('person.id = :personId', { personId })
        .andWhere('u.deletedAt IS NULL')
        .andWhere(cid ? 'u.company_id = :companyId' : '1=1', {
          companyId: cid ?? undefined,
        })
        .getOne(),
    ]);

    return {
      customer: customer
        ? { id: customer.id, isActive: customer.isActive !== false }
        : null,
      supplier: supplier
        ? { id: supplier.id, isActive: supplier.isActive !== false }
        : null,
      employee: employee
        ? { id: employee.id, status: String(employee.status) }
        : null,
      user: user
        ? { id: user.id, userName: user.userName, rol: String(user.rol) }
        : null,
    };
  }

  /**
   * Create a new person
   */
  async create(data: CreatePersonDto) {
    this.applyPersonDocumentRules(data);
    await this.assertDocumentNumberAvailable(
      data.documentNumber,
      data.documentType,
    );
    const geo = sanitizePersonGeoActivityFields({
      regionCode: data.regionCode,
      regionName: data.regionName,
      communeCode: data.communeCode,
      communeName: data.communeName,
      treasuryCode: data.treasuryCode,
      activityStarted: data.activityStarted,
      economicActivities: data.economicActivities as any,
    });
    const person = this.personsRepository.create({
      ...data,
      ...geo,
    });
    return await this.personsRepository.save(person);
  }

  /**
   * Update a person
   */
  async update(id: string, data: UpdatePersonDto) {
    const person = await this.findOne(id);

    const geo = sanitizePersonGeoActivityFields({
      regionCode: data.regionCode,
      regionName: data.regionName,
      communeCode: data.communeCode,
      communeName: data.communeName,
      treasuryCode: data.treasuryCode,
      activityStarted: data.activityStarted,
      economicActivities: data.economicActivities as any,
    });

    Object.assign(person, data, geo);
    this.applyPersonDocumentRules(person as unknown as CreatePersonDto);
    await this.assertDocumentNumberAvailable(
      person.documentNumber,
      person.documentType,
      id,
    );

    return await this.personsRepository.save(person);
  }

  /**
   * Reglas: empresa → RUT (obligatorio).
   * Persona natural puede usar RUT, pasaporte u otro documento.
   * Empresa: exige razón social; si no hay nombre se usa la razón social como firstName (requerido en BD).
   */
  private applyPersonDocumentRules(data: CreatePersonDto): void {
    const row = data as CreatePersonDto & { type?: PersonType; documentType?: DocumentType | null };
    const type = row.type ?? PersonType.NATURAL;

    if (type === PersonType.COMPANY) {
      row.type = PersonType.COMPANY;
      row.documentType = DocumentType.RUT;
      const bn = row.businessName?.trim();
      if (!bn) {
        throw new BadRequestException(
          'La razón social es obligatoria para una persona jurídica (empresa).',
        );
      }
      if (!row.firstName?.trim()) {
        row.firstName = bn;
      }
    }
  }

  private async assertDocumentNumberAvailable(
    documentNumber: string | null | undefined,
    _documentType: DocumentType | null | undefined,
    excludePersonId?: string,
  ): Promise<void> {
    const norm = normalizePersonDocumentNumber(documentNumber);
    if (!norm) {
      return;
    }

    const companyId = TenantContext.getCompanyId();
    const qb = this.personsRepository
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .andWhere(`${DOCUMENT_NORM_SQL} = :norm`, { norm });

    if (companyId) {
      qb.andWhere('p.company_id = :companyId', { companyId });
    }

    if (excludePersonId) {
      qb.andWhere('p.id != :excludePersonId', { excludePersonId });
    }

    const found = await qb.getOne();
    if (found) {
      throw new ConflictException(
        'Ya existe un registro con este número de documento. El documento debe ser único.',
      );
    }
  }

  /**
   * Soft-delete a person
   */
  async remove(id: string) {
    const person = await this.findOne(id);
    await this.personsRepository.softRemove(person);
    return { message: 'Person deleted successfully' };
  }

  /**
   * Add bank account to person
   */
  async addBankAccount(personId: string, accountData: PersonBankAccountDto) {
    const person = await this.findOne(personId);

    // Initialize bankAccounts if null
    if (!person.bankAccounts) {
      person.bankAccounts = [];
    }

    // Generate unique account key
    const accountKey = `${accountData.bankName}_${accountData.accountNumber}_${Date.now()}`;
    const newAccount: PersonBankAccount = {
      ...accountData,
      accountKey,
    };

    // If this is marked as primary, unmark others
    if (newAccount.isPrimary) {
      person.bankAccounts = person.bankAccounts.map((acc) => ({
        ...acc,
        isPrimary: false,
      }));
    }

    // Add new account
    person.bankAccounts.push(newAccount);

    const savedPerson = await this.personsRepository.save(person);

    return savedPerson;
  }

  /**
   * Remove bank account from person
   */
  async removeBankAccount(personId: string, accountKey: string) {
    const person = await this.findOne(personId);

    if (!person.bankAccounts || person.bankAccounts.length === 0) {
      throw new NotFoundException('No bank accounts found for this person');
    }

    const accountIndex = person.bankAccounts.findIndex(
      (acc) => acc.accountKey === accountKey,
    );

    if (accountIndex === -1) {
      throw new NotFoundException(
        `Bank account with key ${accountKey} not found`,
      );
    }

    // Remove account
    person.bankAccounts.splice(accountIndex, 1);

    await this.personsRepository.save(person);

    return { message: 'Bank account removed successfully' };
  }
}
