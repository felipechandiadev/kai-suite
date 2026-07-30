import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export interface GetPersonBalanceResult {
  personId: string;
  personType: 'CUSTOMER' | 'SUPPLIER' | 'SHAREHOLDER' | 'EMPLOYEE';
  balance: number;
  totalDebit: number;
  totalCredit: number;
  entryCount: number;
  period: {
    fromDate?: Date;
    toDate?: Date;
  };
}

export class GetPersonBalanceQuery {
  constructor(
    public readonly personId: string,
    public readonly personType:
      | 'CUSTOMER'
      | 'SUPPLIER'
      | 'SHAREHOLDER'
      | 'EMPLOYEE',
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
  ) {}
}

@Injectable()
@QueryHandler(GetPersonBalanceQuery)
export class GetPersonBalanceQueryHandler implements IQueryHandler<GetPersonBalanceQuery> {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
  ) {}

  async execute(query: GetPersonBalanceQuery): Promise<GetPersonBalanceResult> {
    const { personId, personType, fromDate, toDate } = query;

    const queryBuilder = this.ledgerEntryRepository
      .createQueryBuilder('entry')
      .select([
        'COUNT(entry.id) as entryCount',
        'COALESCE(SUM(entry.debit), 0) as totalDebit',
        'COALESCE(SUM(entry.credit), 0) as totalCredit',
      ])
      .where('entry.personId = :personId', { personId });

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
      personId,
      personType,
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
