import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransfer } from '../../domain/bank-transfer.entity';

@Injectable()
export class TypeOrmBankTransferRepository {
  constructor(
    @InjectRepository(BankTransfer)
    private readonly repository: Repository<BankTransfer>,
  ) {}

  async save(transfer: BankTransfer): Promise<BankTransfer> {
    return this.repository.save(transfer);
  }

  async findById(id: string): Promise<BankTransfer | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<BankTransfer[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: BankTransfer[]; total: number }> {
    const query = this.repository.createQueryBuilder('transfer');

    if (status) {
      query.where('transfer.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('transfer.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    transfer: Partial<BankTransfer>,
  ): Promise<BankTransfer> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, transfer);
    return this.repository.save(entity);
  }
}
