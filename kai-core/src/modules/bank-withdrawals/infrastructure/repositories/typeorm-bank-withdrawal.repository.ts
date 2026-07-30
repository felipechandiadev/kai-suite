import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankWithdrawal } from '../../domain/bank-withdrawal.entity';

@Injectable()
export class TypeOrmBankWithdrawalRepository {
  constructor(
    @InjectRepository(BankWithdrawal)
    private readonly repository: Repository<BankWithdrawal>,
  ) {}

  async save(withdrawal: BankWithdrawal): Promise<BankWithdrawal> {
    return this.repository.save(withdrawal);
  }

  async findById(id: string): Promise<BankWithdrawal | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<BankWithdrawal[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: BankWithdrawal[]; total: number }> {
    const query = this.repository.createQueryBuilder('withdrawal');

    if (status) {
      query.where('withdrawal.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('withdrawal.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    withdrawal: Partial<BankWithdrawal>,
  ): Promise<BankWithdrawal> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, withdrawal);
    return this.repository.save(entity);
  }
}
