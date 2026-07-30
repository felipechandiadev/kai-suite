import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantsRepositoryPort } from '@modules/product-variants/application/ports/product-variants.repository.port';

@Injectable()
export class TypeOrmProductVariantsRepository implements ProductVariantsRepositoryPort {
  private repo: Repository<ProductVariant>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(ProductVariant);
  }

  async save(variant: ProductVariant | any): Promise<ProductVariant> {
    const ent = this.repo.create(variant);
    const saved = await this.repo.save(ent as any);
    return saved as unknown as ProductVariant;
  }

  async findById(id: string): Promise<ProductVariant | null> {
    const found = await this.repo.findOne({
      where: { id } as any,
      relations: [
        'product',
        'product.category',
        'unit',
        'stockBaseUnit',
        'saleUnit',
        'purchaseUnit',
        'priceListItems',
        'priceListItems.priceList',
      ] as any,
    });
    return found as unknown as ProductVariant | null;
  }

  async findAll(filter?: Record<string, any>): Promise<ProductVariant[]> {
    const qb = this.repo
      .createQueryBuilder('v')
      .leftJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.deletedAt IS NULL',
      )
      .leftJoinAndSelect(
        'priceListItem.priceList',
        'priceList',
        'priceList.deletedAt IS NULL AND priceList.isActive = true',
      )
      .leftJoinAndSelect('v.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('v.unit', 'unit')
      .where('v.deletedAt IS NULL');

    if (filter?.productId)
      qb.andWhere('v.productId = :productId', { productId: filter.productId });

    const variants = await qb.getMany();
    return variants as unknown as ProductVariant[];
  }
}
