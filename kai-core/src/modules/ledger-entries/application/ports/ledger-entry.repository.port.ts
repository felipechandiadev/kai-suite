import { LedgerEntry } from '../../domain/ledger-entry.entity';

export interface LedgerEntryRepositoryPort {
  save(ledgerEntry: LedgerEntry): Promise<LedgerEntry>;
  saveMany(ledgerEntries: LedgerEntry[]): Promise<LedgerEntry[]>;
  findById(id: string): Promise<LedgerEntry | null>;
  findByTransactionId(transactionId: string): Promise<LedgerEntry[]>;
  findByAccountId(accountId: string): Promise<LedgerEntry[]>;
  findByPersonId(personId: string): Promise<LedgerEntry[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<LedgerEntry[]>;
  find(options?: any): Promise<LedgerEntry[]>; // Generic find method for complex queries
  create(entity: Partial<LedgerEntry>): LedgerEntry; // TypeORM create method
  createQueryBuilder(alias: string): any; // TypeORM query builder
  remove(ledgerEntry: LedgerEntry): Promise<void>;
}