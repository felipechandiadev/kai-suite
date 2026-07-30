import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../domain/category.entity';
import { Product } from '@modules/products/domain/product.entity';
import { CategoryWithCountsDto } from './dto/category-with-counts.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async findAll(query: any) {
    const categories = await this.categoryRepository.find({
      where: { deletedAt: null as any },
      order: { name: 'ASC' },
    });
    return Promise.all(
      categories.map(async (category) => {
        const assets = await this.multimediaService.listByEntity(
          'category',
          category.id,
        );
        category.primaryImageUrl = assets[0]?.publicUrl ?? null;
        category.mediaAssets = assets.map((asset) => ({
          id: asset.id,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          kind: asset.kind,
        }));
        return category;
      }),
    );
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id, deletedAt: null as any },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    const assets = await this.multimediaService.listByEntity('category', id);
    category.primaryImageUrl = assets[0]?.publicUrl ?? null;
    category.mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));
    return category;
  }

  async create(data: any) {
    try {
      if (!data.name || !data.name.trim()) {
        throw new BadRequestException('El nombre de la categoría es requerido');
      }

      const category = this.categoryRepository.create({
        name: data.name.trim(),
        description: data.description || null,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive !== false,
        resultCenterId: data.resultCenterId || null,
      });

      return await this.categoryRepository.save(category);
    } catch (error: any) {
      console.error('Error creating category:', error);

      // If it's already a NestJS exception, re-throw it
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Otherwise, wrap it
      throw new BadRequestException(
        `Failed to create category: ${error.message}`,
      );
    }
  }

  async update(id: string, data: any) {
    const category = await this.findOne(id);
    Object.assign(category, data);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    category.deletedAt = new Date();
    await this.categoryRepository.save(category);
  }

  /**
   * Get all categories with product and child counts
   */
  async getCategoriesWithCounts(): Promise<CategoryWithCountsDto[]> {
    const categories = await this.categoryRepository.find({
      where: { deletedAt: null as any },
      order: { name: 'ASC' },
    });

    //Build child count map
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
}
