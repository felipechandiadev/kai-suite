import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateBalancesForLedgerEntriesCommand } from '../commands/update-balances-for-ledger-entries.command';
import { AccountBalanceRepositoryPort } from '../ports/account-balance.repository.port';

@CommandHandler(UpdateBalancesForLedgerEntriesCommand)
export class UpdateBalancesForLedgerEntriesHandler implements ICommandHandler<UpdateBalancesForLedgerEntriesCommand> {
  constructor(
    @Inject('AccountBalanceRepositoryPort')
    private readonly balanceRepository: AccountBalanceRepositoryPort,
  ) {}

  async execute(command: UpdateBalancesForLedgerEntriesCommand): Promise<void> {
    await this.balanceRepository.updateBalancesForLedgerEntries(
      command.ledgerEntries,
    );
  }
}
