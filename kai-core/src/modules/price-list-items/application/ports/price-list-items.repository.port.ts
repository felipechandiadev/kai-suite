import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';

export interface PriceListItemsRepositoryPort {
  save(item: PriceListItem | any): Promise<PriceListItem>;
  findByVariantId(variantId: string): Promise<PriceListItem[]>;
  deleteByVariantId(variantId: string): Promise<void>;
}

export const PRICE_LIST_ITEMS_REPOSITORY = 'PRICE_LIST_ITEMS_REPOSITORY';
