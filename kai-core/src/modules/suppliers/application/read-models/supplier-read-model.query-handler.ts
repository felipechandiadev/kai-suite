import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Supplier } from '../../domain/supplier.entity';
import { Person } from '../../../persons/domain/person.entity';
import { Transaction } from '../../../transactions/domain/transaction.entity';
import { Product } from '../../../products/domain/product.entity';
import { Reception } from '../../../receptions/domain/reception.entity';
import {
  SupplierReadModel,
  SupplierSearchFilters,
  SupplierListItem,
  SupplierDetailView,
} from './supplier.read-model';

/**
 * Supplier Read Model Query Handler
 *
 * Provides optimized queries for supplier data using denormalized read models
 * to avoid N+1 queries and complex joins.
 */
@Injectable()
export class SupplierReadModelQueryHandler {
  private readonly logger = new Logger(SupplierReadModelQueryHandler.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Reception)
    private readonly receptionRepository: Repository<Reception>,
  ) {}

  /**
   * Get supplier list with optimized query
   * Returns minimal data for list views
   */
  async getSupplierList(
    filters: SupplierSearchFilters = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: SupplierListItem[]; total: number; totalPages: number }> {
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('s')
      .leftJoin('s.person', 'p')
      .leftJoin('s.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['PURCHASE', 'RECEPTION'],
      })
      .leftJoin('s.products', 'prod', 'prod.isActive = true')
      .select([
        's.id as id',
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",
        'p.documentNumber as documentNumber',
        's.outstandingBalance as outstandingBalance',
        's.isActive as isActive',
        'MAX(t.createdAt) as lastPurchaseDate',
        'COUNT(DISTINCT prod.id) as totalProducts',
      ])
      .where('s.deletedAt IS NULL')
      .groupBy('s.id, p.id');

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

    const items: SupplierListItem[] = rawResults.map((row) => ({
      id: row.id,
      displayName: row.displayname,
      documentNumber: row.documentnumber,
      outstandingBalance: parseFloat(row.outstandingbalance) || 0,
      isActive: row.isactive,
      lastPurchaseDate: row.lastpurchasedate
        ? new Date(row.lastpurchasedate)
        : undefined,
      totalProducts: parseInt(row.totalproducts) || 0,
    }));

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get supplier detail view with full data
   */
  async getSupplierDetail(
    supplierId: string,
  ): Promise<SupplierDetailView | null> {
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('s')
      .leftJoin('s.person', 'p')
      .leftJoin('s.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['PURCHASE', 'RECEPTION'],
      })
      .leftJoin('s.transactions', 'pay', 'pay.type IN (:...paymentTypes)', {
        paymentTypes: ['PAYMENT', 'SUPPLIER_PAYMENT'],
      })
      .leftJoin('s.products', 'prod')
      .leftJoin('s.receptions', 'r', 'r.status = :pendingStatus', {
        pendingStatus: 'PENDING',
      })
      .select([
        // Supplier fields
        's.id as id',
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
        's.taxId as taxId',
        's.website as website',
        's.contactPerson as contactPerson',
        's.paymentTerms as paymentTerms',
        's.isActive as isActive',
        's.notes as notes',
        's.createdAt as createdAt',
        's.updatedAt as updatedAt',

        // Computed fields
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as fullName",
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",

        // Transaction summaries
        'COUNT(DISTINCT t.id) as totalPurchases',
        'COUNT(DISTINCT pay.id) as totalPayments',
        'MAX(t.createdAt) as lastPurchaseDate',
        'MAX(pay.createdAt) as lastPaymentDate',
        's.outstandingBalance as outstandingBalance',

        // Product catalog
        'COUNT(DISTINCT prod.id) as totalProducts',
        'COUNT(DISTINCT CASE WHEN prod.isActive = true THEN prod.id END) as activeProducts',

        // Additional counts
        "COUNT(DISTINCT CASE WHEN pay.status = 'PENDING' THEN pay.id END) as pendingPaymentsCount",
        'COUNT(DISTINCT r.id) as pendingReceptionsCount',
        'COUNT(DISTINCT CASE WHEN prod.isActive = true THEN prod.id END) as activeProductsCount',
      ])
      .where('s.id = :supplierId', { supplierId })
      .andWhere('s.deletedAt IS NULL')
      .groupBy('s.id, p.id');

    const rawResult = await queryBuilder.getRawOne();

    if (!rawResult) {
      return null;
    }

    const supplier: SupplierDetailView = {
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
      taxId: rawResult.taxid,
      website: rawResult.website,
      contactPerson: rawResult.contactperson,
      paymentTerms: rawResult.paymentterms,
      isActive: rawResult.isactive,
      notes: rawResult.notes,
      createdAt: new Date(rawResult.createdat),
      updatedAt: new Date(rawResult.updatedat),

      // Computed fields
      fullName: rawResult.fullname,
      displayName: rawResult.displayname,

      // Transaction summaries
      totalPurchases: parseInt(rawResult.totalpurchases) || 0,
      totalPayments: parseInt(rawResult.totalpayments) || 0,
      lastPurchaseDate: rawResult.lastpurchasedate
        ? new Date(rawResult.lastpurchasedate)
        : undefined,
      lastPaymentDate: rawResult.lastpaymentdate
        ? new Date(rawResult.lastpaymentdate)
        : undefined,
      outstandingBalance: parseFloat(rawResult.outstandingbalance) || 0,

      // Product catalog
      totalProducts: parseInt(rawResult.totalproducts) || 0,
      activeProducts: parseInt(rawResult.activeproducts) || 0,

      // Additional computed fields
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
      pendingReceptionsCount: parseInt(rawResult.pendingreceptionscount) || 0,
      activeProductsCount: parseInt(rawResult.activeproductscount) || 0,
    };

    return supplier;
  }

  /**
   * Search suppliers with text search optimization
   */
  async searchSuppliers(
    searchText: string,
    filters: Omit<SupplierSearchFilters, 'searchText'> = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: SupplierListItem[]; total: number; totalPages: number }> {
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('s')
      .leftJoin('s.person', 'p')
      .leftJoin('s.transactions', 't', 't.type IN (:...purchaseTypes)', {
        purchaseTypes: ['PURCHASE', 'RECEPTION'],
      })
      .leftJoin('s.products', 'prod', 'prod.isActive = true')
      .select([
        's.id as id',
        "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName)) as displayName",
        'p.documentNumber as documentNumber',
        's.outstandingBalance as outstandingBalance',
        's.isActive as isActive',
        'MAX(t.createdAt) as lastPurchaseDate',
        'COUNT(DISTINCT prod.id) as totalProducts',
      ])
      .where('s.deletedAt IS NULL')
      .andWhere(
        '(p.firstName ILIKE :searchText OR p.lastName ILIKE :searchText OR p.businessName ILIKE :searchText OR p.documentNumber ILIKE :searchText OR p.email ILIKE :searchText OR s.contactPerson ILIKE :searchText)',
      )
      .setParameters({ searchText: `%${searchText}%` })
      .groupBy('s.id, p.id');

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

    const items: SupplierListItem[] = rawResults.map((row) => ({
      id: row.id,
      displayName: row.displayname,
      documentNumber: row.documentnumber,
      outstandingBalance: parseFloat(row.outstandingbalance) || 0,
      isActive: row.isactive,
      lastPurchaseDate: row.lastpurchasedate
        ? new Date(row.lastpurchasedate)
        : undefined,
      totalProducts: parseInt(row.totalproducts) || 0,
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
    queryBuilder: SelectQueryBuilder<Supplier>,
    filters: SupplierSearchFilters,
  ): void {
    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('s.isActive = :isActive', {
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

    if (filters.paymentTerms) {
      queryBuilder.andWhere('s.paymentTerms = :paymentTerms', {
        paymentTerms: filters.paymentTerms,
      });
    }

    if (filters.hasOutstandingBalance) {
      queryBuilder.andWhere('s.outstandingBalance > 0');
    }

    if (filters.minOutstandingBalance !== undefined) {
      queryBuilder.andWhere('s.outstandingBalance >= :minOutstandingBalance', {
        minOutstandingBalance: filters.minOutstandingBalance,
      });
    }

    if (filters.maxOutstandingBalance !== undefined) {
      queryBuilder.andWhere('s.outstandingBalance <= :maxOutstandingBalance', {
        maxOutstandingBalance: filters.maxOutstandingBalance,
      });
    }

    if (filters.createdFrom) {
      queryBuilder.andWhere('s.createdAt >= :createdFrom', {
        createdFrom: filters.createdFrom,
      });
    }

    if (filters.createdTo) {
      queryBuilder.andWhere('s.createdAt <= :createdTo', {
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
    queryBuilder: SelectQueryBuilder<Supplier>,
    filters: SupplierSearchFilters,
  ): void {
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'displayName':
        queryBuilder.orderBy(
          "COALESCE(p.businessName, CONCAT(p.firstName, ' ', p.lastName))",
          sortOrder,
        );
        break;
      case 'documentNumber':
        queryBuilder.orderBy('p.documentNumber', sortOrder);
        break;
      case 'outstandingBalance':
        queryBuilder.orderBy('s.outstandingBalance', sortOrder);
        break;
      case 'lastPurchaseDate':
        queryBuilder.orderBy('MAX(t.createdAt)', sortOrder);
        break;
      case 'totalProducts':
        queryBuilder.orderBy('COUNT(DISTINCT prod.id)', sortOrder);
        break;
      case 'createdAt':
      default:
        queryBuilder.orderBy('s.createdAt', sortOrder);
        break;
    }
  }
}
