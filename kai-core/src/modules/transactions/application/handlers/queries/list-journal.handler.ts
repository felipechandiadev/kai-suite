import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListJournalQuery } from '@modules/transactions/application/queries/list-journal.query';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

export interface JournalEntryDto {
  id: string;
  transactionId: string;
  accountingAccountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  description: string;
  documentNumber: string;
  transactionType: string;
  transactionDate: Date;
  entityType?: string;
  entityName?: string;
  notes?: string;
}

@QueryHandler(ListJournalQuery)
export class ListJournalQueryHandler implements IQueryHandler<ListJournalQuery> {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {}

  async execute(query: ListJournalQuery): Promise<{
    rows: JournalEntryDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build journal query which joins transactions with ledger entries and accounting accounts
    // This mirrors the complex SQL from listJournal() service method
    const qb = this.transactionRepository.manager
      .createQueryBuilder()
      .select([
        'le.id',
        'le.transactionId',
        'le.accountingAccountId',
        'aa.code as accountCode',
        'aa.name as accountName',
        'aa.type as accountType',
        'le.debit',
        'le.credit',
        'le.description',
        'tx.documentNumber',
        'tx.transactionType',
        'tx.createdAt as transactionDate',
        'tx.customerId',
        'tx.supplierId',
        'tx.employeeId',
        'tx.shareholderId',
        'tx.notes',
      ])
      .from('ledger_entries', 'le')
      .innerJoin('transactions', 'tx', 'le.transactionId = tx.id')
      .leftJoin('accounting_accounts', 'aa', 'le.accountingAccountId = aa.id');

    // Apply type filter
    if (query.type) {
      qb.andWhere('tx.transactionType = :type', { type: query.type });
    }

    // Apply status filter
    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    // Apply date filters
    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom });
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      qb.andWhere('tx.createdAt <= :dateTo', { dateTo });
    }

    // Apply text search
    if (query.search) {
      qb.andWhere(
        '(tx.documentNumber LIKE :search OR tx.externalReference LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count
    const totalQuery = qb.clone();
    const total = await totalQuery.getCount();

    // Apply pagination
    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    // Order by date descending
    qb.orderBy('tx.createdAt', 'DESC').addOrderBy('le.id', 'ASC');

    const results = await qb.getRawMany();

    // Transform raw results to journal entry DTOs
    const rows: JournalEntryDto[] = results.map((row: any) => ({
      id: row.id,
      transactionId: row.transactionId,
      accountingAccountId: row.accountingAccountId,
      accountCode: row.accountCode || '',
      accountName: row.accountName || '',
      accountType: row.accountType || '',
      debit: Number(row.debit || 0),
      credit: Number(row.credit || 0),
      description: row.description || '',
      documentNumber: row.documentNumber,
      transactionType: row.transactionType,
      transactionDate: new Date(row.transactionDate),
      notes: row.notes,
    }));

    return {
      rows,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
