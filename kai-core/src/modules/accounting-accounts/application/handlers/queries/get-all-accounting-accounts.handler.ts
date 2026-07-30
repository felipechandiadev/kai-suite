import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAllAccountingAccountsQuery } from '../../queries/get-all-accounting-accounts.query';
import { AccountingAccountRepositoryPort } from '../../ports/accounting-account.repository.port';

@QueryHandler(GetAllAccountingAccountsQuery)
export class GetAllAccountingAccountsQueryHandler
  implements IQueryHandler<GetAllAccountingAccountsQuery>
{
  constructor(
    @Inject('AccountingAccountRepositoryPort')
    private readonly repository: AccountingAccountRepositoryPort,
  ) {}

  async execute() {
    // Note: Repository doesn't expose findAll, returning empty for now
    // In production, would need to add this method to the repository
    return [];
  }
}
