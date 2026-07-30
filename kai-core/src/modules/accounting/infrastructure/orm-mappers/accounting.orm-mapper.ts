/**
 * ORM to Domain Mapper for Accounting Module
 * Maps between ORM entities and domain entities
 */

import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export class AccountingOrmMapper {
  static toDomainAccountingAccount(
    ormEntity: unknown,
  ): AccountingAccount | null {
    return ormEntity ? (ormEntity as AccountingAccount) : null;
  }

  static toDomainLedgerEntry(ormEntity: unknown): LedgerEntry | null {
    return ormEntity ? (ormEntity as LedgerEntry) : null;
  }

  static toOrmAccountingAccount(domainEntity: AccountingAccount | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }

  static toOrmLedgerEntry(domainEntity: LedgerEntry | null): unknown {
    return domainEntity ? ({ ...domainEntity } as Record<string, unknown>) : null;
  }
}
