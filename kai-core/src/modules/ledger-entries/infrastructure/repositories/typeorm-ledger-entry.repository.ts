import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryRepositoryPort } from '../../application/ports/ledger-entry.repository.port';
import { LedgerEntry } from '../../domain/ledger-entry.entity';

@Injectable()
export class TypeOrmLedgerEntryRepository implements LedgerEntryRepositoryPort {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly repository: Repository<LedgerEntry>,
  ) {}

  async save(ledgerEntry: LedgerEntry): Promise<LedgerEntry> {
    return await this.repository.save(ledgerEntry);
  }

  async saveMany(ledgerEntries: LedgerEntry[]): Promise<LedgerEntry[]> {
    return await this.repository.save(ledgerEntries);
  }

  async findById(id: string): Promise<LedgerEntry | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  async findByTransactionId(transactionId: string): Promise<LedgerEntry[]> {
    return await this.repository.find({ where: { transactionId } });
  }

  async findByAccountId(accountId: string): Promise<LedgerEntry[]> {
    return await this.repository.find({ where: { accountId } });
  }

  async findByPersonId(personId: string): Promise<LedgerEntry[]> {
    return await this.repository.find({ where: { personId } });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<LedgerEntry[]> {
    return await this.repository
      .createQueryBuilder('le')
      .where('le.entryDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();
  }

  async find(options?: any): Promise<LedgerEntry[]> {
    return await this.repository.find(options);
  }

  create(entity: Partial<LedgerEntry>): LedgerEntry {
    return this.repository.create(entity);
  }

  createQueryBuilder(alias: string): any {
    return this.repository.createQueryBuilder(alias);
  }

  async remove(ledgerEntry: LedgerEntry): Promise<void> {
    await this.repository.remove(ledgerEntry);
  }
}