import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FreezeBalancesForPeriodCommand } from '../commands/freeze-balances-for-period.command';
import { AccountBalanceRepositoryPort } from '../ports/account-balance.repository.port';

@CommandHandler(FreezeBalancesForPeriodCommand)
export class FreezeBalancesForPeriodHandler implements ICommandHandler<FreezeBalancesForPeriodCommand> {
  constructor(
    @Inject('AccountBalanceRepositoryPort')
    private readonly balanceRepository: AccountBalanceRepositoryPort,
  ) {}

  async execute(command: FreezeBalancesForPeriodCommand): Promise<void> {
    await this.balanceRepository.freezeBalancesForPeriod(command.periodId);
  }
}
