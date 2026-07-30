import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingPeriodSnapshot } from '../../domain/accounting-period-snapshot.entity';
import { AccountingPeriodSnapshotRepositoryPort } from '../../application/ports/accounting-period-snapshot.repository.port';

@Injectable()
export class TypeOrmAccountingPeriodSnapshotRepository
  implements AccountingPeriodSnapshotRepositoryPort
{
  constructor(
    @InjectRepository(AccountingPeriodSnapshot)
    private readonly repository: Repository<AccountingPeriodSnapshot>,
  ) {}

  async save(snapshot: AccountingPeriodSnapshot): Promise<AccountingPeriodSnapshot> {
    return this.repository.save(snapshot);
  }

  async findById(id: string): Promise<AccountingPeriodSnapshot | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['period', 'account'],
    });
  }

  async findAll(): Promise<AccountingPeriodSnapshot[]> {
    return this.repository.find({
      relations: ['period', 'account'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    periodId?: string,
    accountId?: string,
  ): Promise<{ items: AccountingPeriodSnapshot[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('snapshot')
      .leftJoinAndSelect('snapshot.period', 'period')
      .leftJoinAndSelect('snapshot.account', 'account')
      .orderBy('snapshot.createdAt', 'DESC');

    if (periodId) {
      queryBuilder.andWhere('snapshot.periodId = :periodId', { periodId });
    }

    if (accountId) {
      queryBuilder.andWhere('snapshot.accountId = :accountId', { accountId });
    }

    const [items, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    snapshot: Partial<AccountingPeriodSnapshot>,
  ): Promise<AccountingPeriodSnapshot> {
    await this.repository.update(id, snapshot);
    const updatedSnapshot = await this.findById(id);
    if (!updatedSnapshot) {
      throw new Error(`AccountingPeriodSnapshot with id ${id} not found after update`);
    }
    return updatedSnapshot;
  }
}