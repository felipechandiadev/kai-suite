import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashDeposit } from '../../domain/cash-deposit.entity';

@Injectable()
export class TypeOrmCashDepositRepository {
  constructor(
    @InjectRepository(CashDeposit)
    private readonly repository: Repository<CashDeposit>,
  ) {}

  async save(deposit: CashDeposit): Promise<CashDeposit> {
    return this.repository.save(deposit);
  }

  async findById(id: string): Promise<CashDeposit | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<CashDeposit[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: CashDeposit[]; total: number }> {
    const query = this.repository.createQueryBuilder('deposit');

    if (status) {
      query.where('deposit.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('deposit.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    deposit: Partial<CashDeposit>,
  ): Promise<CashDeposit> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, deposit);
    return this.repository.save(entity);
  }
}
