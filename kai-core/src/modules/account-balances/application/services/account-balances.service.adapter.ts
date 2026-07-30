import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UpdateBalancesForLedgerEntriesCommand } from '../commands/update-balances-for-ledger-entries.command';
import { FreezeBalancesForPeriodCommand } from '../commands/freeze-balances-for-period.command';
import { GetBalancesForPeriodQuery } from '../queries/get-balances-for-period.query';
import { AccountBalance } from '../../domain/account-balance.entity';
import { LedgerEntryBalancePayload } from '../ports/account-balance.repository.port';

@Injectable()
export class AccountBalancesServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async updateBalancesForLedgerEntries(
    ledgerEntries: LedgerEntryBalancePayload[],
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateBalancesForLedgerEntriesCommand(ledgerEntries),
    );
  }

  async freezeBalancesForPeriod(periodId: string): Promise<void> {
    await this.commandBus.execute(new FreezeBalancesForPeriodCommand(periodId));
  }

  async getBalancesForPeriod(
    companyId: string,
    periodId: string,
  ): Promise<AccountBalance[]> {
    return this.queryBus.execute(
      new GetBalancesForPeriodQuery(companyId, periodId),
    );
  }
}
