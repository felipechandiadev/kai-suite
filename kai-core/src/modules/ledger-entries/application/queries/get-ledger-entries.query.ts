import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export interface GetLedgerEntriesResult {
  entries: {
    id: string;
    transactionId: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    personId: string | null;
    entryDate: Date;
    description: string;
    debit: number;
    credit: number;
    metadata?: Record<string, any>;
  }[];
  total: number;
}

export class GetLedgerEntriesQuery {
  constructor(
    public readonly transactionId?: string,
    public readonly accountId?: string,
    public readonly personId?: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

@Injectable()
@QueryHandler(GetLedgerEntriesQuery)
export class GetLedgerEntriesQueryHandler implements IQueryHandler<GetLedgerEntriesQuery> {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
  ) {}

  async execute(query: GetLedgerEntriesQuery): Promise<GetLedgerEntriesResult> {
    const {
      transactionId,
      accountId,
      personId,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = query;

    const queryBuilder = this.ledgerEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.account', 'account')
      .orderBy('entry.entryDate', 'DESC')
      .addOrderBy('entry.id', 'DESC');

    if (transactionId) {
      queryBuilder.andWhere('entry.transactionId = :transactionId', {
        transactionId,
      });
    }

    if (accountId) {
      queryBuilder.andWhere('entry.accountId = :accountId', { accountId });
    }

    if (personId) {
      queryBuilder.andWhere('entry.personId = :personId', { personId });
    }

    if (fromDate) {
      queryBuilder.andWhere('entry.entryDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('entry.entryDate <= :toDate', { toDate });
    }

    const [entries, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const result = entries.map((entry) => ({
      id: entry.id,
      transactionId: entry.transactionId,
      accountId: entry.accountId,
      accountCode: entry.account?.code || '',
      accountName: entry.account?.name || '',
      personId: entry.personId ?? null,
      entryDate: entry.entryDate,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      metadata: entry.metadata || undefined,
    }));

    return {
      entries: result,
      total,
    };
  }
}
