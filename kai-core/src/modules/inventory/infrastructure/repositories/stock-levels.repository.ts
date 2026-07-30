import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, DataSource } from 'typeorm';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { StockLevelsRepositoryPort } from '@modules/inventory/application/ports/stock-levels.repository.port';
import {
  StockLevelDto,
  StockLevelWithDetailsDto,
  SearchStockFiltersDto,
  StockMovementDto,
  StockFiltersDto,
} from '@modules/inventory/application/dto/stock-level.dto';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { StockLevelOrmEntity } from '@modules/stock-levels/infrastructure/orm-mappers/stock-level.orm-entity';
import { StoragesService } from '@modules/storages/application/storages.service';
import { applyInventoryStockTextSearch } from '@modules/inventory/application/inventory-stock-search.util';

@Injectable()
export class StockLevelsRepository implements StockLevelsRepositoryPort {
  constructor(
    @InjectRepository(StockLevelOrmEntity)
    private readonly stockLevelRepo: Repository<StockLevelOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly storagesService: StoragesService,
  ) {}

  async findById(id: string): Promise<StockLevelDto | null> {
    const entity = await this.stockLevelRepo.findOne({
      where: { id },
      relations: ['variant', 'storage'],
    });
    return entity ? this.toDto(entity) : null;
  }

  async findByVariantAndStorage(
    variantId: string,
    storageId: string,
  ): Promise<StockLevelDto | null> {
    const entity = await this.stockLevelRepo.findOne({
      where: { productVariantId: variantId, storageId },
      relations: ['variant', 'storage'],
    });
    return entity ? this.toDto(entity) : null;
  }

  async findByVariantId(variantId: string): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.find({
      where: { productVariantId: variantId },
      relations: ['variant', 'storage'],
    });
    return entities.map((e) => this.toDto(e));
  }

  async findByStorageId(storageId: string): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.find({
      where: { storageId },
      relations: ['variant', 'storage'],
    });
    return entities.map((e) => this.toDto(e));
  }

  async search(
    filters: SearchStockFiltersDto,
  ): Promise<{ rows: StockLevelWithDetailsDto[]; total: number }> {
    const qb = this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .leftJoinAndSelect('storage.branch', 'branch');

    if (filters.storageId) {
      qb.andWhere('sl.storageId = :storageId', {
        storageId: filters.storageId,
      });
    }
    if (filters.branchId) {
      qb.andWhere('storage.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }
    applyInventoryStockTextSearch(qb, filters.search);

    // Get total before pagination
    const total = await qb.getCount();

    // Apply pagination
    if (filters.limit) {
      qb.limit(filters.limit);
    }
    if (filters.offset) {
      qb.offset(filters.offset);
    }

    const entities = await qb.getMany();

    // Group by variant ID for aggregations
    const grouped: Record<string, StockLevelWithDetailsDto> = {};

    for (const entity of entities) {
      const variant: any = entity.variant;
      const product: any = variant?.product;
      const vid = variant?.id || 'unknown';

      if (!grouped[vid]) {
        grouped[vid] = {
          id: '',
          productVariantId: vid,
          storageId: '',
          physicalStock: 0,
          committedStock: 0,
          availableStock: 0,
          incomingStock: 0,
          pmp: null,
          lastTransactionId: null,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          variantSku: variant?.sku,
          variantName: variant?.name,
          productName: product?.name,
          storageName: '',
          branchName: '',
          unitOfMeasure: variant?.unit?.name,
          minimumStock: variant?.minimumStock,
          baseCost: variant?.baseCost,
          totalValue: 0,
          isBelowMinimum: false,
        };
      }

      const row = grouped[vid];
      const qty = Number(entity.physicalStock || 0);
      const baseCost = Number(variant?.baseCost || 0);

      row.physicalStock += qty;
      row.availableStock += Number(entity.availableStock || 0);
      const variantPmp =
        variant?.pmp != null && Number.isFinite(Number(variant.pmp))
          ? Number(variant.pmp)
          : null;
      row.pmp = variantPmp;
      row.totalValue =
        variantPmp != null ? row.physicalStock * variantPmp : null;
      row.storageName = entity.storage?.name || '';
      row.branchName = entity.storage?.branch?.name || '';

      if (
        variant?.minimumStockEnabled &&
        qty < Number(variant?.minimumStock || 0)
      ) {
        row.isBelowMinimum = true;
      }
    }

    const rows = Object.values(grouped);
    return { rows, total };
  }

  async getTotalStockByVariant(variantId: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .select('SUM(sl.physicalStock)', 'total')
      .where('sl.productVariantId = :vid', { vid: variantId })
      .getRawOne();
    return Number(result?.total || 0);
  }

  async getAvailableStockByVariant(variantId: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .select('SUM(sl.availableStock)', 'total')
      .where('sl.productVariantId = :vid', { vid: variantId })
      .getRawOne();
    return Number(result?.total || 0);
  }

  private movementHistoryQuery(
    variantId: string,
    storageId?: string,
    companyId?: string,
  ) {
    const qb = this.dataSource
      .getRepository(TransactionLine)
      .createQueryBuilder('tl')
      .innerJoin('tl.transaction', 't')
      .leftJoin('t.storageEntry', 's')
      .leftJoin('t.targetStorageEntry', 'ts')
      .where('tl.productVariantId = :vid', { vid: variantId });

    if (companyId?.trim()) {
      qb.andWhere('t.companyId = :companyId', { companyId: companyId.trim() });
    }

    const sid = storageId?.trim();
    if (sid) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('t.storageId = :sid', { sid })
            .orWhere('t.targetStorageId = :sid')
            .orWhere(
              new Brackets((w2) => {
                w2
                  .where('t.storageId IS NULL')
                  .andWhere('t.targetStorageId IS NULL')
                  .andWhere(
                    companyId?.trim()
                      ? `EXISTS (
                          SELECT 1 FROM stock_levels sl
                          WHERE sl."productVariantId" = :vid
                            AND sl."storageId" = :sid
                            AND sl.company_id = :companyId
                        )`
                      : `EXISTS (
                          SELECT 1 FROM stock_levels sl
                          WHERE sl."productVariantId" = :vid
                            AND sl."storageId" = :sid
                        )`,
                  );
              }),
            );
        }),
      );
    }

    return qb;
  }

  private rawField(row: Record<string, unknown>, key: string): unknown {
    const wanted = key.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase() === wanted) {
        return row[k];
      }
    }
    return undefined;
  }

  private movementSignedDelta(direction: 'IN' | 'OUT', quantity: number): number {
    const q = Number(quantity) || 0;
    return direction === 'IN' ? q : -q;
  }

  private async getCurrentPhysicalStockForMovements(
    variantId: string,
    storageId?: string,
    companyId?: string,
  ): Promise<number> {
    const qb = this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .select('COALESCE(SUM(sl.physicalStock), 0)', 'total')
      .where('sl.productVariantId = :vid', { vid: variantId });
    if (companyId?.trim()) {
      qb.andWhere('sl.companyId = :companyId', { companyId: companyId.trim() });
    }
    if (storageId?.trim()) {
      qb.andWhere('sl.storageId = :sid', { sid: storageId.trim() });
    }
    const raw = await qb.getRawOne<{ total?: string | number }>();
    return Number(raw?.total ?? 0);
  }

  private sumSignedDeltasFromRawRows(rows: Record<string, unknown>[]): number {
    return this.mapMovementRows(rows).reduce(
      (sum, row) => sum + this.movementSignedDelta(row.direction, row.quantity),
      0,
    );
  }

  private attachRunningBalances(
    rows: StockMovementDto[],
    currentStock: number,
    priorPagesDeltaSum: number,
  ): StockMovementDto[] {
    let running = currentStock - priorPagesDeltaSum;
    return rows.map((row) => {
      const balanceAfter = running;
      running -= this.movementSignedDelta(row.direction, row.quantity);
      return { ...row, balanceAfter };
    });
  }

  private mapMovementRows(movements: Record<string, unknown>[]): StockMovementDto[] {
    return movements.map((m) => {
      const transactionType = String(this.rawField(m, 'transactionType') ?? '');
      const createdRaw = this.rawField(m, 'createdAt');
      const createdAt =
        createdRaw instanceof Date
          ? createdRaw
          : createdRaw != null && String(createdRaw).trim()
            ? new Date(String(createdRaw))
            : new Date(0);
      return {
        lineId: String(this.rawField(m, 'lineId') ?? this.rawField(m, 'transactionId') ?? ''),
        transactionId: String(this.rawField(m, 'transactionId') ?? ''),
        documentNumber: String(this.rawField(m, 'documentNumber') ?? ''),
        transactionType,
        createdAt,
        quantity: Number(this.rawField(m, 'quantity')),
        notes:
          this.rawField(m, 'notes') != null
            ? String(this.rawField(m, 'notes'))
            : undefined,
        storageName: String(this.rawField(m, 'storageName') ?? ''),
        targetStorageName: (() => {
          const v = this.rawField(m, 'targetStorageName');
          return v != null && String(v).trim() ? String(v) : undefined;
        })(),
        direction: [
          'PURCHASE',
          'TRANSFER_IN',
          'ADJUSTMENT_IN',
          'CASH_SESSION_OPENING',
        ].includes(transactionType)
          ? 'IN'
          : 'OUT',
        balanceAfter: 0,
      };
    });
  }

  async getMovementHistory(
    variantId: string,
    storageId: string,
    limit: number = 5,
  ): Promise<StockMovementDto[]> {
    const { rows } = await this.getMovementHistoryPaginated(
      variantId,
      storageId,
      1,
      limit,
      undefined,
    );
    return rows;
  }

  async getMovementHistoryPaginated(
    variantId: string,
    storageId: string | undefined,
    page: number,
    limit: number,
    companyId?: string,
  ): Promise<{
    rows: StockMovementDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(200, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    const base = this.movementHistoryQuery(variantId, storageId, companyId);
    const total = await base.clone().getCount();

    const [currentStock, priorPagesDeltaSum, movements] = await Promise.all([
      this.getCurrentPhysicalStockForMovements(variantId, storageId, companyId),
      offset > 0
        ? base
            .clone()
            .orderBy('t.createdAt', 'DESC')
            .addOrderBy('tl.id', 'DESC')
            .offset(0)
            .limit(offset)
            .select(['tl.quantity as quantity', 't.transactionType as transactionType'])
            .getRawMany()
            .then((rows) => this.sumSignedDeltasFromRawRows(rows))
        : Promise.resolve(0),
      base
        .clone()
        .orderBy('t.createdAt', 'DESC')
        .addOrderBy('tl.id', 'DESC')
        .offset(offset)
        .limit(limitNum)
        .select([
          'tl.id as lineId',
          't.id as transactionId',
          't.documentNumber as documentNumber',
          't.transactionType as transactionType',
          't.createdAt as createdAt',
          'tl.quantity as quantity',
          't.notes as notes',
          's.name as storageName',
          'ts.name as targetStorageName',
        ])
        .getRawMany(),
    ]);

    const mapped = this.mapMovementRows(movements);
    const rows = this.attachRunningBalances(mapped, currentStock, priorPagesDeltaSum);

    return {
      rows,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async getLowStockItems(
    minimumThreshold: number,
    storageId?: string,
  ): Promise<StockLevelWithDetailsDto[]> {
    const qb = this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .where('sl.physicalStock < :threshold', { threshold: minimumThreshold });

    if (storageId) {
      qb.andWhere('sl.storageId = :sid', { sid: storageId });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.toDto(e) as StockLevelWithDetailsDto);
  }

  async getStockByBranch(
    branchId: string,
  ): Promise<StockLevelWithDetailsDto[]> {
    const entities = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .leftJoinAndSelect('storage.branch', 'branch')
      .where('storage.branchId = :bid', { bid: branchId })
      .getMany();

    return entities.map((e) => this.toDto(e) as StockLevelWithDetailsDto);
  }

  async getFilters(): Promise<StockFiltersDto> {
    const storages = await this.storagesService.getAllStorages(false);
    return {
      storages,
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
  }

  async save(stockLevel: StockLevelDto): Promise<StockLevelDto> {
    const entity = await this.stockLevelRepo.save(stockLevel as any);
    return this.toDto(entity);
  }

  async saveMany(stockLevels: StockLevelDto[]): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.save(stockLevels as any);
    return entities.map((e) => this.toDto(e));
  }

  async delete(id: string): Promise<void> {
    await this.stockLevelRepo.delete({ id });
  }

  private toDto(entity: StockLevelOrmEntity): StockLevelDto {
    return {
      id: entity.id,
      productVariantId: entity.productVariantId,
      storageId: entity.storageId,
      physicalStock: Number(entity.physicalStock),
      committedStock: Number(entity.committedStock),
      availableStock: Number(entity.availableStock),
      incomingStock: Number(entity.incomingStock),
      pmp: 0, // PMP comes from variant, not from StockLevel
      lastTransactionId: entity.lastTransactionId ?? null,
      lastUpdated: entity.lastUpdated,
      updatedAt: entity.updatedAt,
      deletedAt: null, // No soft delete on StockLevel
    };
  }
}
