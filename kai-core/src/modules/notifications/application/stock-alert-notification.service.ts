import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import {
  hasStorageSpecificMinimum,
  sumVariantPhysicalStock,
} from '@modules/stock-realtime/stock-threshold-resolution.util';
import { StockNotificationEvaluator } from './stock-notification.evaluator';
import { NotificationPublisherService } from './notification-publisher.service';

/**
 * Publica alertas de stock tras movimientos de inventario (p. ej. kai-stock /inventory/adjust).
 * Complementa UpdateStockActionHandler por si el evento CQRS no dispara notificaciones.
 */
@Injectable()
export class StockAlertNotificationService {
  private readonly logger = new Logger(StockAlertNotificationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly stockNotificationEvaluator: StockNotificationEvaluator,
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  async publishForVariantStorage(params: {
    companyId: string;
    productVariantId: string;
    storageId: string;
    transactionId?: string | null;
    /** Stock físico tras el movimiento (p. ej. ajuste absoluto desde kai-stock). */
    physicalStockOverride?: number;
    availableStockOverride?: number;
  }): Promise<void> {
    if (!this.notificationPublisher.isStockNotificationsEnabled()) {
      return;
    }

    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: params.productVariantId },
      relations: ['product'],
    });
    if (!variant) {
      return;
    }

    let stockLevel = await this.dataSource.getRepository(StockLevel).findOne({
      where: {
        productVariantId: params.productVariantId,
        storageId: params.storageId,
      },
    });

    if (!stockLevel && params.physicalStockOverride == null) {
      stockLevel = await this.waitForStockLevel(
        params.productVariantId,
        params.storageId,
      );
    }

    if (!stockLevel && params.physicalStockOverride == null) {
      this.logger.debug(
        `Skip stock alert: no stock_levels row for variant=${params.productVariantId} storage=${params.storageId}`,
      );
      return;
    }

    const levelForEval = this.buildLevelForEvaluation(
      stockLevel,
      params,
      variant,
    );

    const storage = await this.dataSource.getRepository(Storage).findOne({
      where: { id: params.storageId },
      select: { id: true, name: true },
    });

    let totalPhysicalStock: number | undefined;
    if (!hasStorageSpecificMinimum(levelForEval)) {
      const allLevels = await this.dataSource.getRepository(StockLevel).find({
        where: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
        select: ['storageId', 'physicalStock'],
      });
      const overridePhysical =
        params.physicalStockOverride != null
          ? Math.max(0, Number(params.physicalStockOverride) || 0)
          : Math.max(0, Number(levelForEval.physicalStock ?? 0) || 0);
      totalPhysicalStock = sumVariantPhysicalStock(allLevels, {
        storageId: params.storageId,
        physical: overridePhysical,
      });
    }

    const cmds = this.stockNotificationEvaluator.evaluate({
      companyId: params.companyId,
      variant,
      stockLevel: levelForEval,
      transactionId: params.transactionId ?? null,
      storageName: storage?.name ?? null,
      totalPhysicalStock,
    });

    for (const cmd of cmds) {
      try {
        await this.notificationPublisher.publish(cmd);
      } catch (e) {
        this.logger.warn(
          `Stock alert notification failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  private buildLevelForEvaluation(
    stockLevel: StockLevel | null,
    params: {
      productVariantId: string;
      storageId: string;
      physicalStockOverride?: number;
      availableStockOverride?: number;
    },
    variant: ProductVariant,
  ): StockLevel {
    const physical =
      params.physicalStockOverride != null
        ? Math.max(0, Number(params.physicalStockOverride) || 0)
        : Math.max(0, Number(stockLevel?.physicalStock ?? 0) || 0);
    const committed = Math.max(0, Number(stockLevel?.committedStock ?? 0) || 0);
    const available =
      params.availableStockOverride != null
        ? Math.max(0, Number(params.availableStockOverride) || 0)
        : Math.max(0, physical - committed);

    if (stockLevel) {
      return Object.assign(stockLevel, {
        physicalStock: physical,
        availableStock: available,
      });
    }

    return {
      id: '',
      companyId: variant.companyId ?? '',
      productVariantId: params.productVariantId,
      storageId: params.storageId,
      physicalStock: physical,
      committedStock: committed,
      availableStock: available,
      incomingStock: 0,
      minimumStock: null,
      maximumStock: null,
      reorderPoint: null,
    } as StockLevel;
  }

  private async waitForStockLevel(
    productVariantId: string,
    storageId: string,
    attempts = 8,
    delayMs = 40,
  ): Promise<StockLevel | null> {
    for (let i = 0; i < attempts; i++) {
      const row = await this.dataSource.getRepository(StockLevel).findOne({
        where: { productVariantId, storageId },
      });
      if (row) {
        return row;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  }
}
