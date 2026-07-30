import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';
import {
  ProductsRepositoryPort,
  PRODUCTS_REPOSITORY,
} from '@modules/products/application/ports/products.repository.port';

@Injectable()
export class ProductsRepository implements ProductsRepositoryPort {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  private toDomain(e: Product): Product {
    return new Product({
      id: e.id,
      categoryId: e.categoryId,
      name: e.name,
      brandId: e.brandId ?? null,
      description: e.description,
      brand: e.brand,
      productType: e.productType,
      taxIds: e.taxIds,
      isActive: e.isActive,
      visibleInEShop: e.visibleInEShop === true,
      resultCenterId: e.resultCenterId ?? null,
      baseUnitId: e.baseUnitId,
      metadata: e.metadata,
      changeHistory: e.changeHistory,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt,
    });
  }

  private toOrm(d: Product): Product {
    const e = new Product();
    e.id = d.id;
    e.categoryId = d.categoryId;
    e.name = d.name;
    e.description = d.description;
    e.brand = d.brand;
    e.brandId = d.brandId ?? null;
    e.productType = d.productType;
    e.taxIds = d.taxIds;
    e.isActive = d.isActive;
    e.visibleInEShop = d.visibleInEShop === true;
    e.resultCenterId = d.resultCenterId ?? null;
    e.baseUnitId = d.baseUnitId;
    e.metadata = d.metadata;
    e.changeHistory = d.changeHistory as any;
    return e;
  }

  async save(product: Product): Promise<Product> {
    const orm = this.toOrm(product);
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Product | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findAll(filter?: Record<string, any>): Promise<Product[]> {
    const found = await this.repo.find({ where: filter ?? {} });
    return found.map((f) => this.toDomain(f));
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
