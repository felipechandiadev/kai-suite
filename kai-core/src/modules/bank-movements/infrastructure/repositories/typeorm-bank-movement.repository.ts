import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankMovement } from '../../domain/bank-movement.entity';

@Injectable()
export class TypeOrmBankMovementRepository {
  constructor(
    @InjectRepository(BankMovement)
    private readonly repository: Repository<BankMovement>,
  ) {}

  async save(movement: BankMovement): Promise<BankMovement> {
    return this.repository.save(movement);
  }

  async findById(id: string): Promise<BankMovement | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<BankMovement[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    direction?: string,
  ): Promise<{ items: BankMovement[]; total: number }> {
    const query = this.repository.createQueryBuilder('movement');

    if (direction) {
      query.where('movement.direction = :direction', { direction });
    }

    const [items, total] = await query
      .orderBy('movement.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    id: string,
    movement: Partial<BankMovement>,
  ): Promise<BankMovement> {
    const entity = await this.repository.findOneOrFail({
      where: { id },
    });
    Object.assign(entity, movement);
    return this.repository.save(entity);
  }
}
