import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { OperationalExpense } from '../domain/operational-expense.entity';

@Injectable()
export class OperationalExpensesRepository {
  constructor(
    @InjectRepository(OperationalExpense)
    private readonly repository: Repository<OperationalExpense>,
  ) {}

  async findAll(
    options?: FindManyOptions<OperationalExpense>,
  ): Promise<OperationalExpense[]> {
    return this.repository.find(options);
  }

  async findOne(id: string): Promise<OperationalExpense | null> {
    return this.repository.findOne({
      where: { id },
      relations: [
        'company',
        'branch',
        'resultCenter',
        'category',
        'supplier',
        'employee',
        'createdByUser',
        'approvedByUser',
      ],
    });
  }

  async create(data: Partial<OperationalExpense>): Promise<OperationalExpense> {
    const expense = this.repository.create(data);
    return this.repository.save(expense);
  }

  async update(
    id: string,
    data: Partial<OperationalExpense>,
  ): Promise<OperationalExpense> {
    await this.repository.update(id, data as any);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error(`OperationalExpense ${id} not found after update`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(options?: FindManyOptions<OperationalExpense>): Promise<number> {
    return this.repository.count(options);
  }
}
