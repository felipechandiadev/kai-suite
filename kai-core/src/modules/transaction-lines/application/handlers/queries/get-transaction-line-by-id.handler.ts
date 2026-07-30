import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTransactionLineByIdQuery } from '../../queries/get-transaction-line-by-id.query';
import { TransactionLinesRepositoryPort } from '../../ports/transaction-lines.repository.port';

@QueryHandler(GetTransactionLineByIdQuery)
export class GetTransactionLineByIdQueryHandler implements IQueryHandler<GetTransactionLineByIdQuery> {
  constructor(
    @Inject('TransactionLinesRepositoryPort')
    private readonly transactionLinesRepository: TransactionLinesRepositoryPort,
  ) {}

  async execute(query: GetTransactionLineByIdQuery) {
    return this.transactionLinesRepository.findById(query.id);
  }
}
