import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler, IQuery } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export class GetInventoryCountsQuery implements IQuery {
  constructor(
    public readonly branchId?: string,
    public readonly storageId?: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
    public readonly hasDifferences?: boolean,
  ) {}
}

export interface InventoryCountSummary {
  id: string;
  branchId: string;
  branchName: string;
  storageId: string;
  storageName: string;
  createdBy: string;
  createdAt: Date;
  totalItems: number;
  totalExpectedQuantity: number;
  totalCountedQuantity: number;
  totalDifference: number;
  hasDifferences: boolean;
  status: 'DRAFT' | 'COMPLETED';
  notes?: string;
}

@Injectable()
@QueryHandler(GetInventoryCountsQuery)
export class GetInventoryCountsQueryHandler implements IQueryHandler<GetInventoryCountsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: GetInventoryCountsQuery): Promise<any[]> {
    const { branchId, storageId, dateFrom, dateTo, hasDifferences } = query;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.notes',
        't.createdAt',
        't.status',
        'b.id',
        'b.name',
        's.id',
        's.name',
        'u.userName',
        'COUNT(tl.id) as totalItems',
        'SUM(tl.quantity) as totalCountedQuantity',
      ])
      .innerJoin('t.lines', 'tl')
      .innerJoin('t.branch', 'b')
      .innerJoin('t.storage', 's')
      .innerJoin('t.user', 'u')
      .where('t.type = :type', { type: 'INVENTORY_COUNT' })
      .groupBy('t.id')
      .addGroupBy('b.id')
      .addGroupBy('b.name')
      .addGroupBy('s.id')
      .addGroupBy('s.name')
      .addGroupBy('u.userName');

    if (branchId) {
      qb.andWhere('b.id = :branchId', { branchId });
    }

    if (storageId) {
      qb.andWhere('s.id = :storageId', { storageId });
    }

    if (dateFrom) {
      qb.andWhere('t.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('t.createdAt <= :dateTo', { dateTo });
    }

    const results = await qb.getRawMany();

    return results
      .filter((result) => result !== null)
      .map((result) => {
        // Parse notes to extract expected quantities and differences
        const notes = result.t_notes || '';
        const expectedMatch = notes.match(/Expected: (\d+)/);
        const differenceMatch = notes.match(/Difference: (-?\d+)/);

        const totalExpectedQuantity = expectedMatch
          ? parseInt(expectedMatch[1])
          : 0;
        const totalDifference = differenceMatch
          ? parseInt(differenceMatch[1])
          : 0;
        const hasDiffs = totalDifference !== 0;

        // Filter by hasDifferences if specified
        if (hasDifferences !== undefined && hasDiffs !== hasDifferences) {
          return null;
        }

        return {
          id: result.t_id,
          branchId: result.b_id,
          branchName: result.b_name,
          storageId: result.s_id,
          storageName: result.s_name,
          createdBy: result.u_userName,
          createdAt: result.t_createdAt,
          totalItems: parseInt(result.totalItems),
          totalExpectedQuantity,
          totalCountedQuantity: parseInt(result.totalCountedQuantity),
          totalDifference,
          hasDifferences: hasDiffs,
          status: result.t_status,
          notes: result.t_notes,
        };
      });
  }
}
