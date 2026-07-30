import { PriceList, PriceListType } from '../../domain/price-list.entity';

export interface PriceListRepositoryPort {
  save(priceList: PriceList): Promise<PriceList>;
  findById(id: string): Promise<PriceList | null>;
  findAll(includeInactive?: boolean): Promise<PriceList[]>;
  update(id: string, priceList: Partial<PriceList>): Promise<PriceList>;
  delete(id: string): Promise<void>;
}