import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCashBalanceQuery } from '../../queries/get-cash-balance.query';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@QueryHandler(GetCashBalanceQuery)
export class GetCashBalanceQueryHandler implements IQueryHandler<GetCashBalanceQuery> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute() {
    return this.bankAccountsRepository.getCashBalance();
  }
}
