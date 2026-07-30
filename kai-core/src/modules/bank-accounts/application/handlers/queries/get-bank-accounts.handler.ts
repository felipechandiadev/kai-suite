import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBankAccountsQuery } from '../../queries/get-bank-accounts.query';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@QueryHandler(GetBankAccountsQuery)
export class GetBankAccountsQueryHandler implements IQueryHandler<GetBankAccountsQuery> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute() {
    return this.bankAccountsRepository.findAll();
  }
}
