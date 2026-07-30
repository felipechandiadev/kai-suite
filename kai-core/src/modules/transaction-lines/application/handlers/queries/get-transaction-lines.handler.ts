import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTransactionLinesQuery } from '../../queries/get-transaction-lines.query';
import { TransactionLinesRepositoryPort } from '../../ports/transaction-lines.repository.port';

@QueryHandler(GetTransactionLinesQuery)
export class GetTransactionLinesQueryHandler implements IQueryHandler<GetTransactionLinesQuery> {
  constructor(
    @Inject('TransactionLinesRepositoryPort')
    private readonly transactionLinesRepository: TransactionLinesRepositoryPort,
  ) {}

  async execute(query: GetTransactionLinesQuery) {
    if (query.transactionId) {
      return this.transactionLinesRepository.findByTransactionId(query.transactionId);
    }

    return this.transactionLinesRepository.findAll();
  }
}
