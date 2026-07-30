import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Check } from '../../domain/check.entity';
import {
  CheckRepositoryPort,
  ListChecksFilter,
} from '../../application/ports/check.repository.port';

@Injectable()
export class TypeOrmCheckRepository implements CheckRepositoryPort {
  constructor(
    @InjectRepository(Check)
    private readonly repository: Repository<Check>,
  ) {}

  async save(check: Check): Promise<Check> {
    return this.repository.save(check);
  }

  async findById(id: string, companyId?: string): Promise<Check | null> {
    return this.repository.findOne({
      where: companyId ? { id, companyId } : { id },
    });
  }

  async list(
    filter: ListChecksFilter,
  ): Promise<{ items: Check[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId: filter.companyId });

    if (filter.status && filter.status.length > 0) {
      qb.andWhere('c.status IN (:...statuses)', { statuses: filter.status });
    }
    if (filter.direction) {
      qb.andWhere('c.direction = :direction', { direction: filter.direction });
    }
    if (filter.dueDateFrom) {
      qb.andWhere('c."dueDate" >= :dueFrom', { dueFrom: filter.dueDateFrom });
    }
    if (filter.dueDateTo) {
      qb.andWhere('c."dueDate" <= :dueTo', { dueTo: filter.dueDateTo });
    }
    if (filter.payeeId) {
      qb.andWhere('c."payeeId" = :payeeId', { payeeId: filter.payeeId });
    }
    if (filter.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(c."checkNumber") LIKE :term', { term })
            .orWhere('LOWER(c."bankName") LIKE :term', { term })
            .orWhere('LOWER(COALESCE(c."drawerName", \'\')) LIKE :term', { term })
            .orWhere('LOWER(COALESCE(c."payeeName", \'\')) LIKE :term', { term });
        }),
      );
    }

    qb.orderBy('c."createdAt"', 'DESC');

    if (filter.limit != null) qb.take(filter.limit);
    if (filter.offset != null) qb.skip(filter.offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async update(id: string, patch: Partial<Check>): Promise<Check> {
    const entity = await this.repository.findOneOrFail({ where: { id } });
    Object.assign(entity, patch);
    return this.repository.save(entity);
  }

  async getCommittedOutgoingSummary(companyId: string) {
    const STALE_DAYS = 90;
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
    const staleCutoffIso = staleCutoff.toISOString().slice(0, 10);

    const rows = await this.repository
      .createQueryBuilder('c')
      .select('c."dueDate"', 'dueDate')
      .addSelect('SUM(c.amount)', 'amount')
      .addSelect('COUNT(*)::int', 'count')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.direction = :direction', { direction: 'OUTGOING' })
      .andWhere('c.status = :status', { status: 'PENDING' })
      .groupBy('c."dueDate"')
      .orderBy('c."dueDate"', 'ASC', 'NULLS LAST')
      .getRawMany<{ dueDate: string | null; amount: string; count: string }>();

    const stalePendingCount = await this.repository
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.direction = :direction', { direction: 'OUTGOING' })
      .andWhere('c.status = :status', { status: 'PENDING' })
      .andWhere(
        `(c."dueDate" IS NOT NULL AND c."dueDate" < :staleCutoff) OR (c."dueDate" IS NULL AND c."issueDate" < :staleCutoff)`,
        { staleCutoff: staleCutoffIso },
      )
      .getCount();

    let totalAmount = 0;
    let checkCount = 0;
    const byDueDate = rows.map((r) => {
      const amount = Number(r.amount) || 0;
      const count = Number(r.count) || 0;
      totalAmount += amount;
      checkCount += count;
      return {
        dueDate: r.dueDate ?? null,
        amount,
        count,
      };
    });

    return { totalAmount, checkCount, byDueDate, stalePendingCount };
  }
}
