import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '../../../domain/stock-level.entity';
import { GetStockLevelsQuery, GetStockLevelsQueryResult } from '../../queries/get-stock-levels.query';

@Injectable()
@QueryHandler(GetStockLevelsQuery)
export class GetStockLevelsQueryHandler implements IQueryHandler<GetStockLevelsQuery> {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
  ) {}

  async execute(query: GetStockLevelsQuery): Promise<GetStockLevelsQueryResult> {
    const { productVariantId, storageId } = query;

    const queryBuilder = this.stockLevelRepository.createQueryBuilder('sl');

    if (productVariantId) {
      queryBuilder.andWhere('sl.productVariantId = :productVariantId', { productVariantId });
    }

    if (storageId) {
      queryBuilder.andWhere('sl.storageId = :storageId', { storageId });
    }

    const stockLevels = await queryBuilder.getMany();

    return {
      stockLevels: stockLevels.map(sl => ({
        id: sl.id,
        productVariantId: sl.productVariantId,
        storageId: sl.storageId,
        physicalStock: sl.physicalStock,
        committedStock: sl.committedStock,
        availableStock: sl.availableStock,
        incomingStock: sl.incomingStock,
      })),
    };
  }
}