import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { AccountingRepositoryPort } from '../../application/ports/accounting-repository.port';

@Injectable()
export class TypeOrmAccountingRepository implements AccountingRepositoryPort {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly accountingAccountRepository: Repository<AccountingAccount>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
  ) {}

  async findAccountingAccountById(id: string): Promise<AccountingAccount | null> {
    return this.accountingAccountRepository.findOneBy({ id });
  }

  async findLedgerEntriesByAccount(accountId: string): Promise<LedgerEntry[]> {
    return this.ledgerEntryRepository.find({
      where: { account: { id: accountId } },
    });
  }

  async saveLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    return this.ledgerEntryRepository.save(entry);
  }
}