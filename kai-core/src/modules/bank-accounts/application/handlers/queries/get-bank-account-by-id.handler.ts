import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBankAccountByIdQuery } from '../../queries/get-bank-account-by-id.query';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@QueryHandler(GetBankAccountByIdQuery)
export class GetBankAccountByIdQueryHandler implements IQueryHandler<GetBankAccountByIdQuery> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute(query: GetBankAccountByIdQuery) {
    return this.bankAccountsRepository.findById(query.accountKey);
  }
}
