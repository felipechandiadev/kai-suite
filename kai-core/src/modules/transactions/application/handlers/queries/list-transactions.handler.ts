import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ListTransactionsQuery } from '@modules/transactions/application/queries/transaction-queries';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { TransactionSummaryReadModel } from '@modules/transactions/application/read-models/transaction.read-models';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

export interface PaginatedTransactionResult {
  transactions: TransactionSummaryReadModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListTransactionsQuery)
export class ListTransactionsQueryHandler implements IQueryHandler<ListTransactionsQuery> {
  private readonly logger = new Logger(ListTransactionsQueryHandler.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {}

  async execute(
    query: ListTransactionsQuery,
  ): Promise<PaginatedTransactionResult> {
    this.logger.debug(
      `Listing transactions: page ${query.page}, limit ${query.limit}`,
    );

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.customer', 'customer')
      .leftJoinAndSelect('t.branch', 'branch')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('t.lines', 'lines');

    // Apply filters
    if (query.transactionType) {
      qb.andWhere('t.transactionType = :transactionType', {
        transactionType: query.transactionType,
      });
    }

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere('t.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.userId) {
      qb.andWhere('t.userId = :userId', { userId: query.userId });
    }

    if (query.startDate) {
      qb.andWhere('t.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('t.createdAt <= :endDate', { endDate: query.endDate });
    }

    if (query.minAmount) {
      qb.andWhere('t.totalAmount >= :minAmount', {
        minAmount: query.minAmount,
      });
    }

    if (query.maxAmount) {
      qb.andWhere('t.totalAmount <= :maxAmount', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(t.transactionNumber ILIKE :search OR customer.name ILIKE :search OR t.notes ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count
    const total = await qb.getCount();

    // Apply pagination and ordering
    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const transactionEntities = await qb.getMany();

    // Convert to read models
    const transactions = transactionEntities.map((entity) => {
      const itemCount = entity.lines?.length || 0;

      return new TransactionSummaryReadModel(
        entity.id,
        entity.documentNumber,
        entity.transactionType as TransactionType,
        entity.status as TransactionStatus,
        entity.total,
        entity.paymentMethod as PaymentMethod,
        entity.branchId || '',
        entity.branch?.name || 'Unknown Branch',
        entity.userId || '',
        entity.user?.userName || 'Unknown User',
        entity.createdAt,
        entity.createdAt,
        entity.createdAt,
        itemCount,
        entity.customerId,
        entity.customerId
          ? `Customer ${entity.customerId.slice(0, 8)}`
          : undefined,
      );
    });

    const totalPages = Math.ceil(total / query.limit);

    const result: PaginatedTransactionResult = {
      transactions,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };

    this.logger.debug(
      `Retrieved ${transactions.length} transactions (${total} total)`,
    );
    return result;
  }
}
