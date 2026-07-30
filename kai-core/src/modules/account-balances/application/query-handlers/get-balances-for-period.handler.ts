import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetBalancesForPeriodQuery } from '../queries/get-balances-for-period.query';
import { AccountBalanceRepositoryPort } from '../ports/account-balance.repository.port';
import { AccountBalance } from '../../domain/account-balance.entity';

@QueryHandler(GetBalancesForPeriodQuery)
export class GetBalancesForPeriodHandler implements IQueryHandler<
  GetBalancesForPeriodQuery,
  AccountBalance[]
> {
  constructor(
    @Inject('AccountBalanceRepositoryPort')
    private readonly balanceRepository: AccountBalanceRepositoryPort,
  ) {}

  async execute(query: GetBalancesForPeriodQuery): Promise<AccountBalance[]> {
    return this.balanceRepository.findBalancesForPeriod(
      query.companyId,
      query.periodId,
    );
  }
}
