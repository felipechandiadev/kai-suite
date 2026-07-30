import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../../domain/transaction.entity';

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
    const sales = await this.transactionRepository.find({
      where: {
        cashSessionId: query.cashSessionId,
        transactionType: TransactionType.SALE,
      },
    });
    return sales.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
  }
}
