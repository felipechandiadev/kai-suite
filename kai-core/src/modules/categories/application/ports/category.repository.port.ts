import { Category } from '../../domain/category.entity';
import { CategoryWithCountsDto } from '../dto/category-with-counts.dto';

export interface CategoryRepositoryPort {
  save(category: Category): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  findAllWithCounts(): Promise<CategoryWithCountsDto[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    search?: string,
  ): Promise<{ items: Category[]; total: number }>;
  update(id: string, category: Partial<Category>): Promise<Category>;
  softDelete(id: string): Promise<void>;
}
