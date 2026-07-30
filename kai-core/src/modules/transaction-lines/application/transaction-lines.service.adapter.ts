import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetTransactionLinesQuery } from './queries/get-transaction-lines.query';
import { GetTransactionLineByIdQuery } from './queries/get-transaction-line-by-id.query';
import { TransactionLine } from '../domain/transaction-line.entity';

@Injectable()
export class TransactionLinesServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getTransactionLines(transactionId?: string): Promise<TransactionLine[]> {
    return this.queryBus.execute(new GetTransactionLinesQuery(transactionId));
  }

  async getTransactionLineById(id: string): Promise<TransactionLine | null> {
    return this.queryBus.execute(new GetTransactionLineByIdQuery(id));
  }
}
