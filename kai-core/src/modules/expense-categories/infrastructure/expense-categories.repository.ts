import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ExpenseCategory } from '../domain/expense-category.entity';

@Injectable()
export class ExpenseCategoriesRepository {
  constructor(
    @InjectRepository(ExpenseCategory)
    private readonly repository: Repository<ExpenseCategory>,
  ) {}

  async findAll(
    options?: FindManyOptions<ExpenseCategory>,
  ): Promise<ExpenseCategory[]> {
    return this.repository.find(options);
  }

  async findOne(id: string): Promise<ExpenseCategory | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['company', 'defaultResultCenter'],
    });
  }

  async findByCode(code: string): Promise<ExpenseCategory | null> {
    const trimmed = code.trim();
    if (!trimmed) {
      return null;
    }
    return this.repository.findOne({
      where: { code: trimmed },
      relations: ['company', 'defaultResultCenter'],
    });
  }

  async create(data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const category = this.repository.create(data);
    return this.repository.save(category);
  }

  async update(
    id: string,
    data: Partial<ExpenseCategory>,
  ): Promise<ExpenseCategory> {
    await this.repository.update(id, data as any);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error(`ExpenseCategory ${id} not found after update`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async count(options?: FindManyOptions<ExpenseCategory>): Promise<number> {
    return this.repository.count(options);
  }
}
