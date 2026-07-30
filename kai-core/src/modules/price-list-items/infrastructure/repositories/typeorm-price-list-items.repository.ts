import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { PriceListItemsRepositoryPort } from '@modules/price-list-items/application/ports/price-list-items.repository.port';

@Injectable()
export class TypeOrmPriceListItemsRepository implements PriceListItemsRepositoryPort {
  private repo: Repository<PriceListItem>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(PriceListItem);
  }

  async save(item: PriceListItem | any): Promise<PriceListItem> {
    const ent = this.repo.create(item);
    const saved = await this.repo.save(ent as any);
    return saved as unknown as PriceListItem;
  }

  async findByVariantId(variantId: string): Promise<PriceListItem[]> {
    const found = await this.repo.find({
      where: { productVariantId: variantId } as any,
      relations: ['priceList'] as any,
    });
    return found as unknown as PriceListItem[];
  }

  async deleteByVariantId(variantId: string): Promise<void> {
    await this.repo.delete({ productVariantId: variantId } as any);
  }
}
