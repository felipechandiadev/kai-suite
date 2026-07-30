import { StockLevel } from '../../domain/stock-level.entity';

export interface StockLevelsRepositoryPort {
  findByProductVariantAndStorage(productVariantId: string, storageId: string): Promise<StockLevel | null>;
  save(stockLevel: StockLevel): Promise<StockLevel>;
  findAll(): Promise<StockLevel[]>;
}