import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevelsRepositoryPort } from '../../application/ports/stock-levels.repository.port';
import { StockLevel } from '../../domain/stock-level.entity';

@Injectable()
export class TypeOrmStockLevelsRepository implements StockLevelsRepositoryPort {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
  ) {}

  async findByProductVariantAndStorage(productVariantId: string, storageId: string): Promise<StockLevel | null> {
    return this.stockLevelRepository.findOne({
      where: { productVariantId, storageId },
    });
  }

  async save(stockLevel: StockLevel): Promise<StockLevel> {
    return this.stockLevelRepository.save(stockLevel);
  }

  async findAll(): Promise<StockLevel[]> {
    return this.stockLevelRepository.find();
  }
}