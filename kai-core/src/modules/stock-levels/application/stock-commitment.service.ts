import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockLevel } from '../domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockRealtimePublisher } from '@modules/stock-realtime/stock-realtime.publisher';
import { buildStockUpdatedPayload } from '@modules/stock-realtime/stock-threshold-alert-payload.util';

export type StockCommitmentParams = {
  companyId: string;
  variantId: string;
  storageId: string;
  qty: number;
  lastTransactionId?: string | null;
};

@Injectable()
export class StockCommitmentService {
  constructor(private readonly stockRealtime: StockRealtimePublisher) {}

  /**
   * Incrementa stock reservado (committed). No exige physicalStock >= qty.
   */
  async reserve(
    manager: EntityManager,
    params: StockCommitmentParams,
  ): Promise<StockLevel> {
    const qty = Number(params.qty) || 0;
    if (qty <= 0) {
      throw new Error('Reservation quantity must be positive');
    }
    const entry = await this.applyCommittedDelta(manager, params, qty);
    await this.emitIfPossible(manager, params.companyId, entry, params.lastTransactionId);
    return entry;
  }

  /**
   * Libera stock reservado (compensación / fase 2).
   */
  async release(
    manager: EntityManager,
    params: StockCommitmentParams,
  ): Promise<StockLevel> {
    const qty = Number(params.qty) || 0;
    if (qty <= 0) {
      throw new Error('Release quantity must be positive');
    }
    const entry = await this.applyCommittedDelta(manager, params, -qty);
    await this.emitIfPossible(manager, params.companyId, entry, params.lastTransactionId);
    return entry;
  }

  recalculateAvailable(stockLevel: StockLevel): void {
    const physical = Number(stockLevel.physicalStock ?? 0);
    const committed = Number(stockLevel.committedStock ?? 0);
    stockLevel.availableStock = Number((physical - committed).toFixed(6));
  }

  private async applyCommittedDelta(
    manager: EntityManager,
    params: StockCommitmentParams,
    delta: number,
  ): Promise<StockLevel> {
    const stockRepo = manager.getRepository(StockLevel);
    let entry = await stockRepo.findOne({
      where: {
        productVariantId: params.variantId,
        storageId: params.storageId,
      },
    });

    if (!entry) {
      entry = stockRepo.create({
        companyId: params.companyId,
        productVariantId: params.variantId,
        storageId: params.storageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
        lastTransactionId: params.lastTransactionId ?? null,
      });
    }

    entry.committedStock = Number(
      (Number(entry.committedStock ?? 0) + delta).toFixed(6),
    );
    if (params.lastTransactionId) {
      entry.lastTransactionId = params.lastTransactionId;
    }
    this.recalculateAvailable(entry);
    return stockRepo.save(entry);
  }

  private async emitIfPossible(
    manager: EntityManager,
    companyId: string,
    entry: StockLevel,
    transactionId?: string | null,
  ): Promise<void> {
    const variant = await manager.getRepository(ProductVariant).findOne({
      where: { id: entry.productVariantId },
      select: ['id', 'minimumStock', 'maximumStock', 'reorderPoint'],
    });
    const payload = buildStockUpdatedPayload(
      companyId,
      variant,
      entry,
      transactionId,
    );
    this.stockRealtime.emitStockUpdated(payload);
  }
}
