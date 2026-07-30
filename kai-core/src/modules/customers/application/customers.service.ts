import { Injectable, ConflictException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import {
  Transaction,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SearchCustomersDto } from './dto/search-customers.dto';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from './ports/customers.repository.port';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { TenantContext } from '@common/tenant';
import { EshopCustomerAccount } from '@modules/e-shop/domain/eshop-customer-account.entity';
import { sanitizePersonGeoActivityFields } from '@modules/persons/application/person-geo-activity.util';
import { normalizePersonDocumentNumber } from '@modules/persons/application/person-document.util';

enum PersonType {
  NATURAL = 'NATURAL',
  BUSINESS = 'BUSINESS',
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepository: CustomersRepositoryPort,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(EshopCustomerAccount)
    private readonly eshopAccountRepository: Repository<EshopCustomerAccount>,
    private readonly companiesService: CompaniesService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const {
      personId: linkPersonId,
      personType,
      firstName,
      lastName,
      businessName,
      documentNumber,
      documentType,
      email,
      phone,
      address,
      creditLimit,
      paymentDayOfMonth,
      notes,
    } = createCustomerDto;

    if (linkPersonId && (personType || firstName)) {
      throw new BadRequestException(
        'Envíe solo personId o los datos de persona, no ambos.',
      );
    }
    if (!linkPersonId && (!personType || !firstName)) {
      throw new BadRequestException(
        'Debe indicar personId o los datos de la persona (personType y firstName).',
      );
    }

    const geo = sanitizePersonGeoActivityFields({
      regionCode: createCustomerDto.regionCode,
      regionName: createCustomerDto.regionName,
      communeCode: createCustomerDto.communeCode,
      communeName: createCustomerDto.communeName,
      treasuryCode: createCustomerDto.treasuryCode,
      activityStarted: createCustomerDto.activityStarted,
      economicActivities: createCustomerDto.economicActivities as any,
    });

    const companyId = TenantContext.getCompanyId();
    if (companyId) {
      const icc =
        await this.companiesService.getInternalCustomerCreditSettings(companyId);
      const lim = Number(creditLimit) || 0;
      if (!icc.enabled && lim > 0) {
        throw new BadRequestException(
          'El crédito interno está deshabilitado para esta empresa; el límite de crédito debe ser 0.',
        );
      }
    }

    if (linkPersonId) {
      const linked = await this.personRepository.findOne({
        where: { id: linkPersonId },
      });
      if (!linked || linked.deletedAt) {
        throw new BadRequestException('La persona indicada no existe.');
      }
      if (companyId && linked.companyId && linked.companyId !== companyId) {
        throw new BadRequestException(
          'La persona no pertenece a la empresa activa.',
        );
      }

      const existingForLink = await this.customersRepository.findByPersonId(
        linked.id,
      );
      if (existingForLink && !existingForLink.deletedAt) {
        throw new ConflictException(
          'Ya existe un cliente asociado a esta persona.',
        );
      }

      let customerFromLink = existingForLink;
      if (customerFromLink && customerFromLink.deletedAt) {
        customerFromLink.deletedAt = undefined as any;
        customerFromLink.isActive = true;
        customerFromLink.creditLimit = creditLimit || 0;
        customerFromLink.paymentDayOfMonth = paymentDayOfMonth || 5;
        customerFromLink.notes = notes || undefined;
        await this.customersRepository.save(customerFromLink);
      } else {
        customerFromLink = (await this.customersRepository.save({
          personId: linked.id,
          creditLimit: creditLimit || 0,
          currentBalance: 0,
          paymentDayOfMonth: paymentDayOfMonth || 5,
          isActive: true,
          notes: notes || undefined,
        } as any)) as Customer;
      }

      const creditInfo = await this.calculateAvailableCredit(customerFromLink.id);
      const displayName = this.buildDisplayName(linked);
      return {
        success: true,
        customer: {
          customerId: customerFromLink.id,
          personId: customerFromLink.personId,
          displayName,
          documentType: linked.documentType || null,
          documentNumber: linked.documentNumber || null,
          email: linked.email || null,
          phone: linked.phone || null,
          address: linked.address || null,
          creditLimit: creditInfo.creditLimit,
          usedCredit: creditInfo.usedCredit,
          availableCredit: creditInfo.availableCredit,
          paymentDayOfMonth: customerFromLink.paymentDayOfMonth,
          createdAt: customerFromLink.createdAt,
          updatedAt: customerFromLink.updatedAt,
        },
      };
    }

    let person: Person | null = null;

    if (documentNumber) {
      const norm = normalizePersonDocumentNumber(documentNumber);
      if (norm) {
        const qb = this.personRepository
          .createQueryBuilder('p')
          .withDeleted()
          .where(
            `regexp_replace(lower(trim(coalesce(p.documentNumber, ''))), '[.[:space:]-]', '', 'g') = :norm`,
            { norm },
          );
        if (companyId) {
          qb.andWhere('p.company_id = :companyId', { companyId });
        }
        person = await qb.getOne();
      }

      if (person) {
        const existingCustomer = await this.customersRepository.findByPersonId(
          person.id,
        );

        if (existingCustomer && !existingCustomer.deletedAt) {
          throw new ConflictException(
            'Ya existe un cliente con ese documento.',
          );
        }

        if (existingCustomer && existingCustomer.deletedAt) {
          existingCustomer.deletedAt = undefined as any;
          existingCustomer.isActive = true;
          existingCustomer.creditLimit = creditLimit || 0;
          existingCustomer.paymentDayOfMonth = paymentDayOfMonth || 5;
          existingCustomer.notes = notes || undefined;
          await this.customersRepository.save(existingCustomer);

          person.deletedAt = undefined as any;
          person.type = personType as any;
          person.firstName = firstName!;
          person.lastName = lastName || undefined;
          person.businessName = businessName || undefined;
          person.documentType = documentType as any;
          person.email = email || undefined;
          person.phone = phone || undefined;
          person.address = address || undefined;
          Object.assign(person, geo);
          await this.personRepository.save(person);

          const creditInfo = await this.calculateAvailableCredit(
            existingCustomer.id,
          );
          const displayName = this.buildDisplayName(person);

          return {
            success: true,
            customer: {
              customerId: existingCustomer.id,
              personId: existingCustomer.personId,
              displayName,
              documentType: person.documentType || null,
              documentNumber: person.documentNumber || null,
              email: person.email || null,
              phone: person.phone || null,
              address: person.address || null,
              creditLimit: creditInfo.creditLimit,
              usedCredit: creditInfo.usedCredit,
              availableCredit: creditInfo.availableCredit,
              paymentDayOfMonth: existingCustomer.paymentDayOfMonth,
              createdAt: existingCustomer.createdAt,
              updatedAt: existingCustomer.updatedAt,
            },
          };
        }
      }
    }

    if (!person) {
      person = this.personRepository.create({
        type: personType as any,
        firstName: firstName!,
        lastName: lastName || undefined,
        businessName: businessName || undefined,
        documentType: (documentType as any) || null,
        documentNumber: documentNumber || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        ...geo,
      });
      await this.personRepository.save(person);
    } else {
      person.deletedAt = undefined as any;
      person.type = personType as any;
      person.firstName = firstName!;
      person.lastName = lastName || undefined;
      person.businessName = businessName || undefined;
      person.documentType = (documentType as any) || null;
      person.documentNumber = documentNumber || undefined;
      person.email = email || undefined;
      person.phone = phone || undefined;
      person.address = address || undefined;
      Object.assign(person, geo);
      await this.personRepository.save(person);
    }

    let customer = await this.customersRepository.findByPersonId(person.id);
    if (!customer || !customer.id) {
      const toSave: any = {
        personId: person.id,
        creditLimit: creditLimit || 0,
        currentBalance: 0,
        paymentDayOfMonth: paymentDayOfMonth || 5,
        isActive: true,
        notes: notes || undefined,
      };
      customer = (await this.customersRepository.save(toSave)) as Customer;
    }
    if (!customer?.id) {
      throw new ConflictException('No se pudo crear el registro de cliente.');
    }

    const displayName = this.buildDisplayName(person);

    return {
      success: true,
      customer: {
        customerId: customer.id,
        personId: customer.personId,
        displayName,
        documentType: person.documentType || null,
        documentNumber: person.documentNumber || null,
        email: person.email || null,
        phone: person.phone || null,
        address: person.address || null,
        creditLimit: customer.creditLimit,
        usedCredit: 0,
        availableCredit: customer.creditLimit,
        paymentDayOfMonth: customer.paymentDayOfMonth,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    };
  }

  async update(customerId: string, updateData: any) {
    const customer = await this.customersRepository.findByIdWithPerson(
      customerId as any,
    );

    if (!customer) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    // Update customer fields
    if (updateData.creditLimit !== undefined) {
      customer.creditLimit = updateData.creditLimit;
    }
    if (updateData.paymentDayOfMonth !== undefined) {
      customer.paymentDayOfMonth = updateData.paymentDayOfMonth;
    }
    if (updateData.notes !== undefined) {
      customer.notes = updateData.notes;
    }
    if (updateData.isActive !== undefined) {
      customer.isActive = updateData.isActive;
    }

    const updated = await this.customersRepository.update(
      customerId,
      customer as any,
    );

    return {
      success: true,
      customer: {
        customerId: updated.id,
        creditLimit: updated.creditLimit,
        paymentDayOfMonth: updated.paymentDayOfMonth,
        notes: updated.notes,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async delete(customerId: string) {
    const customer = await this.customersRepository.findById(customerId as any);
    if (!customer) return { success: false, error: 'Cliente no encontrado' };
    await this.customersRepository.softDelete(customerId as any);
    return { success: true, message: 'Cliente eliminado correctamente' };
  }

  // Restored methods required by controllers

  async findOne(id: string) {
    const customer = await this.customersRepository.findByIdWithPerson(id);

    if (!customer) return null;

    const creditInfo = await this.calculateAvailableCredit(customer.id);

    const p = customer.person || null;

    const eshopAccount = await this.eshopAccountRepository.findOne({
      where: { customerId: customer.id },
    });

    let eshopAccountView: {
      accountId: string;
      username: string | null;
      loginEmail: string;
      registeredAt: Date;
      emailVerifiedAt: Date | null;
      updatedAt: Date;
      webOrdersCount: number;
    } | null = null;

    if (eshopAccount) {
      const webOrdersCount = await this.transactionRepository
        .createQueryBuilder('tx')
        .where('tx.customerId = :customerId', { customerId: customer.id })
        .andWhere(`tx.metadata->>'source' = 'e-shop'`)
        .getCount();

      eshopAccountView = {
        accountId: eshopAccount.id,
        username: eshopAccount.username?.trim() || null,
        loginEmail: eshopAccount.email.trim(),
        registeredAt: eshopAccount.createdAt,
        emailVerifiedAt: eshopAccount.emailVerifiedAt ?? null,
        updatedAt: eshopAccount.updatedAt,
        webOrdersCount,
      };
    }

    return {
      customerId: customer.id,
      personId: customer.personId,
      personType: p?.type ?? null,
      firstName: p?.firstName ?? null,
      lastName: p?.lastName ?? null,
      businessName: p?.businessName ?? null,
      displayName: this.buildDisplayName(p),
      documentType: p?.documentType || null,
      documentNumber: p?.documentNumber || null,
      email: p?.email || null,
      phone: p?.phone || null,
      address: p?.address || null,
      regionCode: p?.regionCode ?? null,
      regionName: p?.regionName ?? null,
      communeCode: p?.communeCode ?? null,
      communeName: p?.communeName ?? null,
      treasuryCode: p?.treasuryCode ?? null,
      activityStarted:
        p?.activityStarted === true ||
        (Array.isArray(p?.economicActivities) && p.economicActivities.length > 0),
      economicActivities: p?.economicActivities ?? null,
      creditLimit: creditInfo.creditLimit,
      usedCredit: creditInfo.usedCredit,
      availableCredit: creditInfo.availableCredit,
      paymentDayOfMonth: customer.paymentDayOfMonth,
      isActive: !!customer.isActive,
      notes: customer.notes || null,
      eshopAccount: eshopAccountView,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async getPayments(customerId: string) {
    const payments = await this.customersRepository.getTransactions(customerId);

    const mapped = payments.map((p) => ({
      id: p.id,
      documentNumber: (p as any).documentNumber || null,
      type: (p as any).transactionType || null,
      status: (p as any).status || null,
      total: Number((p as any).total ?? 0),
      paymentMethod: (p as any).paymentMethod || null,
      createdAt: p.createdAt,
    }));

    return {
      success: true,
      total: mapped.length,
      payments: mapped,
    };
  }

  async search(dto: SearchCustomersDto) {
    const { query = '', page = 1, pageSize = 10, activeOnly } = dto;

    const filter: Record<string, unknown> = { searchQuery: query };
    if (activeOnly === true) {
      filter.isActive = true;
    }

    // Delegate to repository port pagination/search
    const { customers: items, total } =
      await this.customersRepository.findAllWithPagination(filter, page, pageSize);

    const customerIds = items.map((c) => c.id);
    const eshopAccounts =
      customerIds.length > 0
        ? await this.eshopAccountRepository.find({
            where: { customerId: In(customerIds) },
            select: ['customerId', 'username', 'email'],
          })
        : [];
    const eshopByCustomerId = new Map(
      eshopAccounts.map((account) => [account.customerId, account]),
    );

    const customers = items.map((c) => {
      const creditLimit = Number(c.creditLimit || 0);
      const currentBalance = Number(c.currentBalance || 0);
      const availableCredit = Math.max(0, creditLimit - currentBalance);
      const eshopAccount = eshopByCustomerId.get(c.id);

      return {
        customerId: c.id,
        personId: c.personId,
        displayName: this.buildDisplayName(c.person || null),
        documentType: c.person?.documentType || null,
        documentNumber: c.person?.documentNumber || null,
        email: c.person?.email || null,
        phone: c.person?.phone || null,
        creditLimit,
        currentBalance,
        availableCredit,
        paymentDayOfMonth: c.paymentDayOfMonth || null,
        isActive: !!c.isActive,
        hasEshopAccount: !!eshopAccount,
        eshopUsername: eshopAccount?.username?.trim() || null,
        eshopLoginEmail: eshopAccount?.email?.trim() || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return { success: true, page, pageSize, total, customers };
  }

  async buildOfflineSnapshot(query: {
    cursor?: string;
    limit?: number;
  }): Promise<{
    success: true;
    items: Array<{
      customerId: string;
      displayName: string;
      documentNumber: string | null;
      phone: string | null;
      email: string | null;
      searchName: string;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = Math.min(Math.max(query.limit ?? 500, 50), 1000);
    const cursor = query.cursor?.trim() || null;
    const fetchLimit = limit + 1;
    const rows = await this.customersRepository.findOfflineSnapshotPage(
      cursor,
      fetchLimit,
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items = pageRows.map((c) => {
      const displayName = this.buildDisplayName(c.person || null);
      const documentNumber = c.person?.documentNumber?.trim() || null;
      const phone = c.person?.phone?.trim() || null;
      const email = c.person?.email?.trim() || null;
      const searchName = [displayName, documentNumber, phone, email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return {
        customerId: c.id,
        displayName,
        documentNumber,
        phone,
        email,
        searchName,
      };
    });

    const nextCursor =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1].id
        : null;

    return { success: true, items, nextCursor, hasMore };
  }

  async getPendingPayments(customerId: string) {
    // Return a list of pending transactions/payments for the customer. Minimal implementation for now.
    const pending =
      await this.customersRepository.getPendingPayments(customerId);

    // Map quotas if present; keep shape compatible with callers
    const mapped = pending.map((p) => ({
      transactionId: p.id,
      documentNumber: (p as any).documentNumber ?? null,
      transactionDate: p.createdAt,
      total: Number(p.total || 0),
      quotas: (p as any).quotas || [],
    }));

    return mapped;
  }

  async getPurchases(
    customerId: string,
    status?: string,
    page?: number,
    pageSize?: number,
  ) {
    const result = await this.customersRepository.getPurchases(
      customerId,
      status,
      page,
      pageSize,
    );

    return {
      success: true,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      purchases: result.items.map((p) => ({
        id: p.id,
        documentNumber: (p as any).documentNumber ?? null,
        status: p.status,
        total: Number(p.total || 0),
        createdAt: p.createdAt,
      })),
    };
  }

  private buildDisplayName(person: Person | null): string {
    if (!person) {
      return 'Cliente sin nombre';
    }

    if (person.businessName && person.businessName.trim().length > 0) {
      return person.businessName.trim();
    }

    const names = [person.firstName, person.lastName].filter(
      (value) => value && value.trim().length > 0,
    );
    if (names.length > 0) {
      return names.join(' ').trim();
    }

    return person.firstName?.trim() || 'Cliente sin nombre';
  }

  private async calculateAvailableCredit(customerId: string) {
    const customer = await this.customersRepository.findById(customerId as any);

    if (!customer) return { creditLimit: 0, usedCredit: 0, availableCredit: 0 };

    const creditLimit = Number(customer.creditLimit || 0);
    const usedCredit = Number(customer.currentBalance || 0);
    const availableCredit = Math.max(0, creditLimit - usedCredit);

    return { creditLimit, usedCredit, availableCredit };
  }
}
