import { BaseCommand } from '@shared/cqrs';
import { LedgerEntryBalancePayload } from '../ports/account-balance.repository.port';

export class UpdateBalancesForLedgerEntriesCommand extends BaseCommand {
  constructor(public readonly ledgerEntries: LedgerEntryBalancePayload[]) {
    super();
  }
}
