import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Customer } from '../../domain/customer.entity';
import { Person } from '../../../persons/domain/person.entity';
import { Transaction } from '../../../transactions/domain/transaction.entity';
import {
  CustomerReadModel,
  CustomerSearchFilters,
  CustomerListItem,
  CustomerDetailView,
} from './customer.read-model';

/**
 * Customer Read Model Query Handler
 *
 * Provides optimized queries for customer data using denormalized read models
 * to avoid N+1 queries and complex joins.
 */
@Injectable()
export class CustomerReadModelQueryHandler {
  private readonly logger = new Logger(CustomerReadModelQueryHandler.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Get customer list with optimized query
   * Returns minimal data for list views
   */
  async getCustomerList(
    filters: CustomerSearchFilters = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: CustomerListItem[]; total: number; totalPages: number }> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('c')
      .leftJoin('c.person', 'p')
      .leftJoin('c.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['SALE', 'INSTALLMENT_SALE'],
      })
      .leftJoin('c.transactions', 'pay', 'pay.type IN (:...paymentTypes)', {
        paymentTypes: ['PAYMENT', 'CREDIT_PAYMENT'],
      })
      .select([
        'c.id as id',
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",
        'p.documentNumber as documentNumber',
        '(c.creditLimit - c.currentBalance) as availableCredit',
        'c.isActive as isActive',
        'MAX(t.createdAt) as lastPurchaseDate',
      ])
      .where('c.deletedAt IS NULL')
      .groupBy('c.id, p.id');

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    // Apply sorting
    this.applySorting(queryBuilder, filters);

    // Get total count
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply pagination
    queryBuilder.offset((page - 1) * pageSize).limit(pageSize);

    const rawResults = await queryBuilder.getRawMany();

    const items: CustomerListItem[] = rawResults.map((row) => ({
      id: row.id,
      displayName: row.displayname,
      documentNumber: row.documentnumber,
      availableCredit: parseFloat(row.availablecredit) || 0,
      isActive: row.isactive,
      lastPurchaseDate: row.lastpurchasedate
        ? new Date(row.lastpurchasedate)
        : undefined,
    }));

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get customer detail view with full data
   */
  async getCustomerDetail(
    customerId: string,
  ): Promise<CustomerDetailView | null> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('c')
      .leftJoin('c.person', 'p')
      .leftJoin('c.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['SALE', 'INSTALLMENT_SALE'],
      })
      .leftJoin('c.transactions', 'pay', 'pay.type IN (:...paymentTypes)', {
        paymentTypes: ['PAYMENT', 'CREDIT_PAYMENT'],
      })
      .leftJoin('c.installments', 'i', 'i.status = :activeStatus', {
        activeStatus: 'ACTIVE',
      })
      .select([
        // Customer fields
        'c.id as id',
        'p.id as personId',
        'p.personType as personType',
        'p.firstName as firstName',
        'p.lastName as lastName',
        'p.businessName as businessName',
        'p.documentType as documentType',
        'p.documentNumber as documentNumber',
        'p.email as email',
        'p.phone as phone',
        'p.address as address',
        'c.creditLimit as creditLimit',
        'c.currentBalance as currentBalance',
        'c.paymentDayOfMonth as paymentDayOfMonth',
        'c.isActive as isActive',
        'c.notes as notes',
        'c.createdAt as createdAt',
        'c.updatedAt as updatedAt',

        // Computed fields
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as fullName",
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",
        '(c.creditLimit - c.currentBalance) as availableCredit',

        // Transaction summaries
        'COUNT(DISTINCT t.id) as totalPurchases',
        'COUNT(DISTINCT pay.id) as totalPayments',
        'MAX(t.createdAt) as lastPurchaseDate',
        'MAX(pay.createdAt) as lastPaymentDate',

        // Additional counts
        "COUNT(DISTINCT CASE WHEN pay.status = 'PENDING' THEN pay.id END) as pendingPaymentsCount",
        "COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id END) as pendingPurchasesCount",
        'COUNT(DISTINCT i.id) as activeInstallmentsCount',
      ])
      .where('c.id = :customerId', { customerId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.id, p.id');

    const rawResult = await queryBuilder.getRawOne();

    if (!rawResult) {
      return null;
    }

    const customer: CustomerDetailView = {
      id: rawResult.id,
      personId: rawResult.personid,
      personType: rawResult.persontype,
      firstName: rawResult.firstname,
      lastName: rawResult.lastname,
      businessName: rawResult.businessname,
      documentType: rawResult.documenttype,
      documentNumber: rawResult.documentnumber,
      email: rawResult.email,
      phone: rawResult.phone,
      address: rawResult.address,
      creditLimit: parseFloat(rawResult.creditlimit) || 0,
      currentBalance: parseFloat(rawResult.currentbalance) || 0,
      paymentDayOfMonth: rawResult.paymentdayofmonth,
      isActive: rawResult.isactive,
      notes: rawResult.notes,
      createdAt: new Date(rawResult.createdat),
      updatedAt: new Date(rawResult.updatedat),

      // Computed fields
      fullName: rawResult.fullname,
      displayName: rawResult.displayname,
      availableCredit: parseFloat(rawResult.availablecredit) || 0,

      // Transaction summaries
      totalPurchases: parseInt(rawResult.totalpurchases) || 0,
      totalPayments: parseInt(rawResult.totalpayments) || 0,
      lastPurchaseDate: rawResult.lastpurchasedate
        ? new Date(rawResult.lastpurchasedate)
        : undefined,
      lastPaymentDate: rawResult.lastpaymentdate
        ? new Date(rawResult.lastpaymentdate)
        : undefined,

      // Additional computed fields
      creditUtilizationPercentage:
        rawResult.creditlimit > 0
          ? (rawResult.currentbalance / rawResult.creditlimit) * 100
          : 0,
      daysSinceLastPurchase: rawResult.lastpurchasedate
        ? Math.floor(
            (Date.now() - new Date(rawResult.lastpurchasedate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : undefined,
      daysSinceLastPayment: rawResult.lastpaymentdate
        ? Math.floor(
            (Date.now() - new Date(rawResult.lastpaymentdate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : undefined,

      // Counts
      pendingPaymentsCount: parseInt(rawResult.pendingpaymentscount) || 0,
      pendingPurchasesCount: parseInt(rawResult.pendingpurchasescount) || 0,
      activeInstallmentsCount: parseInt(rawResult.activeinstallmentscount) || 0,
    };

    return customer;
  }

  /**
   * Search customers with text search optimization
   */
  async searchCustomers(
    searchText: string,
    filters: Omit<CustomerSearchFilters, 'searchText'> = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: CustomerListItem[]; total: number; totalPages: number }> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('c')
      .leftJoin('c.person', 'p')
      .leftJoin('c.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['SALE', 'INSTALLMENT_SALE'],
      })
      .select([
        'c.id as id',
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",
        'p.documentNumber as documentNumber',
        '(c.creditLimit - c.currentBalance) as availableCredit',
        'c.isActive as isActive',
        'MAX(t.createdAt) as lastPurchaseDate',
      ])
      .where('c.deletedAt IS NULL')
      .andWhere(
        '(p.firstName ILIKE :searchText OR p.lastName ILIKE :searchText OR p.businessName ILIKE :searchText OR p.documentNumber ILIKE :searchText OR p.email ILIKE :searchText)',
      )
      .setParameters({ searchText: `%${searchText}%` })
      .groupBy('c.id, p.id');

    // Apply additional filters
    this.applyFilters(queryBuilder, filters);

    // Apply sorting
    this.applySorting(queryBuilder, { ...filters, sortBy: 'displayName' });

    // Get total count
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply pagination
    queryBuilder.offset((page - 1) * pageSize).limit(pageSize);

    const rawResults = await queryBuilder.getRawMany();

    const items: CustomerListItem[] = rawResults.map((row) => ({
      id: row.id,
      displayName: row.displayname,
      documentNumber: row.documentnumber,
      availableCredit: parseFloat(row.availablecredit) || 0,
      isActive: row.isactive,
      lastPurchaseDate: row.lastpurchasedate
        ? new Date(row.lastpurchasedate)
        : undefined,
    }));

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Customer>,
    filters: CustomerSearchFilters,
  ): void {
    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('c.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.personType) {
      queryBuilder.andWhere('p.personType = :personType', {
        personType: filters.personType,
      });
    }

    if (filters.documentType) {
      queryBuilder.andWhere('p.documentType = :documentType', {
        documentType: filters.documentType,
      });
    }

    if (filters.documentNumber) {
      queryBuilder.andWhere('p.documentNumber = :documentNumber', {
        documentNumber: filters.documentNumber,
      });
    }

    if (filters.minCreditLimit !== undefined) {
      queryBuilder.andWhere('c.creditLimit >= :minCreditLimit', {
        minCreditLimit: filters.minCreditLimit,
      });
    }

    if (filters.maxCreditLimit !== undefined) {
      queryBuilder.andWhere('c.creditLimit <= :maxCreditLimit', {
        maxCreditLimit: filters.maxCreditLimit,
      });
    }

    if (filters.hasAvailableCredit) {
      queryBuilder.andWhere('c.creditLimit > c.currentBalance');
    }

    if (filters.createdFrom) {
      queryBuilder.andWhere('c.createdAt >= :createdFrom', {
        createdFrom: filters.createdFrom,
      });
    }

    if (filters.createdTo) {
      queryBuilder.andWhere('c.createdAt <= :createdTo', {
        createdTo: filters.createdTo,
      });
    }

    if (filters.lastPurchaseFrom) {
      queryBuilder.andWhere('t.createdAt >= :lastPurchaseFrom', {
        lastPurchaseFrom: filters.lastPurchaseFrom,
      });
    }

    if (filters.lastPurchaseTo) {
      queryBuilder.andWhere('t.createdAt <= :lastPurchaseTo', {
        lastPurchaseTo: filters.lastPurchaseTo,
      });
    }
  }

  /**
   * Apply sorting to query builder
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Customer>,
    filters: CustomerSearchFilters,
  ): void {
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'fullName':
        queryBuilder.orderBy(
          "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName))",
          sortOrder,
        );
        break;
      case 'documentNumber':
        queryBuilder.orderBy('p.documentNumber', sortOrder);
        break;
      case 'creditLimit':
        queryBuilder.orderBy('c.creditLimit', sortOrder);
        break;
      case 'currentBalance':
        queryBuilder.orderBy('c.currentBalance', sortOrder);
        break;
      case 'lastPurchaseDate':
        queryBuilder.orderBy('MAX(t.createdAt)', sortOrder);
        break;
      case 'createdAt':
      default:
        queryBuilder.orderBy('c.createdAt', sortOrder);
        break;
    }
  }
}
