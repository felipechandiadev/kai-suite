import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../../domain/budget.entity';
import { BudgetRepositoryPort } from '../../application/ports/budget.repository.port';

@Injectable()
export class TypeOrmBudgetRepository implements BudgetRepositoryPort {
  constructor(
    @InjectRepository(Budget)
    private readonly repository: Repository<Budget>,
  ) {}

  async save(budget: Budget): Promise<Budget> {
    return this.repository.save(budget);
  }

  async findById(id: string): Promise<Budget | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['company', 'resultCenter', 'createdByUser'],
    });
  }

  async findAll(): Promise<Budget[]> {
    return this.repository.find({
      relations: ['company', 'resultCenter', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    companyId?: string,
    status?: string,
  ): Promise<{ items: Budget[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.company', 'company')
      .leftJoinAndSelect('budget.resultCenter', 'resultCenter')
      .leftJoinAndSelect('budget.createdByUser', 'createdByUser')
      .orderBy('budget.createdAt', 'DESC');

    if (companyId) {
      queryBuilder.andWhere('budget.companyId = :companyId', { companyId });
    }

    if (status) {
      queryBuilder.andWhere('budget.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async update(id: string, budget: Partial<Budget>): Promise<Budget> {
    await this.repository.update(id, budget);
    const updatedBudget = await this.findById(id);
    if (!updatedBudget) {
      throw new Error(`Budget with id ${id} not found after update`);
    }
    return updatedBudget;
  }
}