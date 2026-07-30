import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountingAccountByIdQuery } from '../../queries/get-accounting-account-by-id.query';
import { AccountingAccountRepositoryPort } from '../../ports/accounting-account.repository.port';

@QueryHandler(GetAccountingAccountByIdQuery)
export class GetAccountingAccountByIdQueryHandler
  implements IQueryHandler<GetAccountingAccountByIdQuery>
{
  constructor(
    @Inject('AccountingAccountRepositoryPort')
    private readonly repository: AccountingAccountRepositoryPort,
  ) {}

  async execute(query: GetAccountingAccountByIdQuery) {
    return this.repository.findById(query.id);
  }
}
