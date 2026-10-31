import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';

export class GetTotalSalesForSessionQuery {
  constructor(public readonly cashSessionId: string) {}
}

@Injectable()
@QueryHandler(GetTotalSalesForSessionQuery)
export class GetTotalSalesForSessionQueryHandler implements IQueryHandler<GetTotalSalesForSessionQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: GetTotalSalesForSessionQuery): Promise<number> {
    // Las ventas anuladas, canceladas o en borrador no cuentan para el cierre.
    const raw = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .where('t.cashSessionId = :cashSessionId', { cashSessionId: query.cashSessionId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', {
        excluded: [
          TransactionStatus.VOIDED,
          TransactionStatus.CANCELLED,
          TransactionStatus.DRAFT,
        ],
      })
      .getRawOne<{ total: string }>();
    return Number(raw?.total) || 0;
  }
}
