import { Budget } from '../../domain/budget.entity';

export interface BudgetRepositoryPort {
  save(budget: Budget): Promise<Budget>;
  findById(id: string): Promise<Budget | null>;
  findAll(): Promise<Budget[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    companyId?: string,
    status?: string,
  ): Promise<{ items: Budget[]; total: number }>;
  update(id: string, budget: Partial<Budget>): Promise<Budget>;
}
