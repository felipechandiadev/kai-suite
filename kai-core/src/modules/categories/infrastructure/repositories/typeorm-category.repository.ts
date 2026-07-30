import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../domain/category.entity';
import { Product } from '../../../products/domain/product.entity';
import { CategoryRepositoryPort } from '../../application/ports/category.repository.port';
import { CategoryWithCountsDto } from '../../application/dto/category-with-counts.dto';

@Injectable()
export class TypeOrmCategoryRepository implements CategoryRepositoryPort {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async save(category: Category): Promise<Category> {
    return this.categoryRepository.save(category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { id, deletedAt: null as any },
    });
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { deletedAt: null as any },
      order: { name: 'ASC' },
    });
  }

  async findAllWithCounts(): Promise<CategoryWithCountsDto[]> {
    const categories = await this.categoryRepository.find({
      where: { deletedAt: null as any },
      order: { name: 'ASC' },
    });

    // Build child count map
    const childCountMap: Record<string, number> = {};
    for (const category of categories) {
      if (category.parentId) {
        childCountMap[category.parentId] =
          (childCountMap[category.parentId] || 0) + 1;
      }
    }

    // Build product count map
    const productCountMap: Record<string, number> = {};
    if (categories.length > 0) {
      const categoryIds = categories.map((cat) => cat.id);

      type ProductCountRow = { categoryId: string | null; count: string };
      const rawCounts = await this.productRepository
        .createQueryBuilder('product')
        .select('product.categoryId', 'categoryId')
        .addSelect('COUNT(*)', 'count')
        .where('product.deletedAt IS NULL')
        .andWhere('product.isActive = :isActive', { isActive: true })
        .andWhere('product.categoryId IN (:...categoryIds)', { categoryIds })
        .groupBy('product.categoryId')
        .getRawMany<ProductCountRow>();

      for (const row of rawCounts) {
        if (row.categoryId) {
          productCountMap[row.categoryId] = Number(row.count) || 0;
        }
      }
    }

    // Map categories to DTO
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      productCount: productCountMap[category.id] || 0,
      childCount: childCountMap[category.id] || 0,
    }));
  }

  async update(id: string, category: Partial<Category>): Promise<Category> {
    await this.categoryRepository.update(id, category as any);
    const updatedCategory = await this.findById(id);
    if (!updatedCategory) {
      throw new Error(`Category with id ${id} not found`);
    }
    return updatedCategory;
  }

  async findAllPaginated(
    limit: number,
    offset: number,
    search?: string,
  ): Promise<{ items: Category[]; total: number }> {
    const qb = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.deletedAt IS NULL');

    if (search && search.trim().length > 0) {
      const q = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        'LOWER(category.name) LIKE :q OR LOWER(category.description) LIKE :q',
        { q },
      );
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy('category.name', 'ASC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return { items, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.categoryRepository.update(id, { deletedAt: new Date() } as any);
  }
}
