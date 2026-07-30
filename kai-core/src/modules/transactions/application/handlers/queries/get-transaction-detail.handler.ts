import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import { GetTransactionDetailQuery } from '@modules/transactions/application/queries/transaction-queries';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import {
  TransactionDetailReadModel,
  TransactionLineSummary,
  TransactionPaymentSummary,
} from '@modules/transactions/application/read-models/transaction.read-models';
import { CacheService } from '@shared/cache/cache.service';

@QueryHandler(GetTransactionDetailQuery)
export class GetTransactionDetailQueryHandler implements IQueryHandler<GetTransactionDetailQuery> {
  private readonly logger = new Logger(GetTransactionDetailQueryHandler.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    query: GetTransactionDetailQuery,
  ): Promise<TransactionDetailReadModel> {
    this.logger.debug(`Getting transaction detail: ${query.transactionId}`);

    // Try cache first
    const cached = await this.cacheService.getTransactionDetails(
      query.transactionId,
    );
    if (cached) {
      this.logger.debug(
        `Transaction detail found in cache: ${query.transactionId}`,
      );
      return cached;
    }

    // Fetch from database with all relations
    const transactionEntity = await this.transactionRepository.findOne({
      where: { id: query.transactionId },
      relations: [
        'customer',
        'branch',
        'user',
        'lines',
        'lines.product',
        'payments',
      ],
    });

    if (!transactionEntity) {
      throw new NotFoundException(
        `Transaction ${query.transactionId} not found`,
      );
    }

    // Build read model
    const readModel = new TransactionDetailReadModel(
      transactionEntity.id,
      transactionEntity.documentNumber,
      transactionEntity.transactionType as TransactionType,
      transactionEntity.status as TransactionStatus,
      transactionEntity.total,
      transactionEntity.paymentMethod as PaymentMethod,
      transactionEntity.customer
        ? {
            id: transactionEntity.customer.id,
            name: `Customer ${transactionEntity.customer.id.slice(0, 8)}`,
            email: '',
            phone: '',
          }
        : null,
      {
        id: transactionEntity.branch?.id || '',
        name: transactionEntity.branch?.name || 'Unknown Branch',
        address: transactionEntity.branch?.address || '',
      },
      {
        id: transactionEntity.user?.id || '',
        name: transactionEntity.user?.userName || 'Unknown User',
        email: transactionEntity.user?.mail || '',
      },
      transactionEntity.lines?.map(
        (line) =>
          new TransactionLineSummary(
            line.id,
            line.productId || '',
            line.product?.name || 'Unknown Product',
            line.quantity,
            line.unitPrice,
            line.discountAmount || 0,
            line.total,
          ),
      ) || [],
      [] as TransactionPaymentSummary[],
      transactionEntity.createdAt,
      transactionEntity.createdAt,
      transactionEntity.createdAt,
      transactionEntity.notes,
    );

    // Cache the result
    await this.cacheService.setTransactionDetails(
      query.transactionId,
      readModel,
    );

    this.logger.debug(
      `Transaction detail retrieved and cached: ${query.transactionId}`,
    );
    return readModel;
  }
}
