import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export interface LedgerEntryData {
  id: string;
  transactionId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  reference: string;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
}

export interface GetLedgerDataResult {
  entries: LedgerEntryData[];
  accounts: LedgerAccount[];
}

export class GetLedgerDataQuery {
  constructor(public readonly includeInactive: boolean = false) {}
}

@Injectable()
@QueryHandler(GetLedgerDataQuery)
export class GetLedgerDataQueryHandler implements IQueryHandler<GetLedgerDataQuery> {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly accountRepository: Repository<AccountingAccount>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
  ) {}

  async execute(query: GetLedgerDataQuery): Promise<GetLedgerDataResult> {
    const { includeInactive } = query;

    // Get accounts
    const accountQuery = this.accountRepository.createQueryBuilder('account');
    if (!includeInactive) {
      accountQuery.where('account.isActive = :isActive', { isActive: true });
    }
    const accounts = await accountQuery
      .orderBy('account.code', 'ASC')
      .getMany();

    // Get ledger entries
    const ledgerEntries = await this.ledgerEntryRepository.find({
      relations: ['transaction', 'account'],
      order: { entryDate: 'DESC' },
    });

    const entries: LedgerEntryData[] = (ledgerEntries || []).map(
      (entry: LedgerEntry) => ({
        id: entry.id,
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        accountCode: entry.account?.code || '',
        accountName: entry.account?.name || '',
        date: entry.entryDate,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        reference:
          entry.transaction?.documentNumber ||
          entry.transaction?.externalReference ||
          '',
      }),
    );

    const accountList: LedgerAccount[] = accounts.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
    }));

    return {
      entries,
      accounts: accountList,
    };
  }
}
