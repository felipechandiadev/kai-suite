import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetProductStocksQuery } from '../../queries/get-product-stocks.query';
import { DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

export interface ProductStockInfo {
  warehouseId: string;
  warehouseName: string | null;
  stock: number;
}

export interface GetProductStocksResult {
  success: boolean;
  stocks: ProductStockInfo[];
}

@QueryHandler(GetProductStocksQuery)
export class GetProductStocksQueryHandler implements IQueryHandler<
  GetProductStocksQuery,
  GetProductStocksResult
> {
  private readonly logger = new Logger(GetProductStocksQueryHandler.name);

  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetProductStocksQuery): Promise<GetProductStocksResult> {
    this.logger.debug(`Fetching stocks for product ${query.productId}`);

    const raw = await this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .innerJoin('sl.variant', 'variant')
      .innerJoin('sl.storage', 'storage')
      .select('storage.id', 'warehouseId')
      .addSelect('storage.name', 'warehouseName')
      .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
      .where('variant.productId = :productId', { productId: query.productId })
      .andWhere('storage.deletedAt IS NULL')
      .groupBy('storage.id')
      .addGroupBy('storage.name')
      .getRawMany();

    return {
      success: true,
      stocks: raw.map((r) => ({
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName ?? null,
        stock: Number(r.stock ?? 0),
      })),
    };
  }
}
