import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export interface GetAccountBalanceResult {
  accountId: string;
  balance: number;
  totalDebit: number;
  totalCredit: number;
  entryCount: number;
  period: {
    fromDate?: Date;
    toDate?: Date;
  };
}

export class GetAccountBalanceQuery {
  constructor(
    public readonly accountId: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
  ) {}
}

@Injectable()
@QueryHandler(GetAccountBalanceQuery)
export class GetAccountBalanceQueryHandler implements IQueryHandler<GetAccountBalanceQuery> {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
  ) {}

  async execute(
    query: GetAccountBalanceQuery,
  ): Promise<GetAccountBalanceResult> {
    const { accountId, fromDate, toDate } = query;

    const queryBuilder = this.ledgerEntryRepository
      .createQueryBuilder('entry')
      .select([
        'COUNT(entry.id) as entryCount',
        'COALESCE(SUM(entry.debit), 0) as totalDebit',
        'COALESCE(SUM(entry.credit), 0) as totalCredit',
      ])
      .where('entry.accountId = :accountId', { accountId });

    if (fromDate) {
      queryBuilder.andWhere('entry.entryDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('entry.entryDate <= :toDate', { toDate });
    }

    const result = await queryBuilder.getRawOne();

    const totalDebit = Number(result?.totalDebit || 0);
    const totalCredit = Number(result?.totalCredit || 0);
    const balance = totalDebit - totalCredit;
    const entryCount = Number(result?.entryCount || 0);

    return {
      accountId,
      balance,
      totalDebit,
      totalCredit,
      entryCount,
      period: {
        fromDate,
        toDate,
      },
    };
  }
}
