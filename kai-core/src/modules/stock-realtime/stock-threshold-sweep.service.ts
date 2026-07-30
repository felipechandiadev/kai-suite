import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { buildStockUpdatedPayload } from './stock-threshold-alert-payload.util';
import {
  hasStorageSpecificMinimum,
  sumVariantPhysicalStock,
} from './stock-threshold-resolution.util';
import { StockRealtimePublisher } from './stock-realtime.publisher';
import { StockNotificationEvaluator } from '@modules/notifications/application/stock-notification.evaluator';
import { NotificationPublisherService } from '@modules/notifications/application/notification-publisher.service';
import { Storage } from '@modules/storages/domain/storage.entity';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Re-emite por WebSocket saldos que violan umbrales (p. ej. cambios vía SQL u otros canales
 * sin pasar por `TransactionCreatedEvent`). Intervalo configurable con `STOCK_THRESHOLD_SWEEP_MS`
 * (0 = desactivado).
 */
@Injectable()
export class StockThresholdSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StockThresholdSweepService.name);
  private interval?: NodeJS.Timeout;
  private firstTimeout?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    private readonly publisher: StockRealtimePublisher,
    private readonly stockNotificationEvaluator: StockNotificationEvaluator,
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  onModuleInit() {
    const raw = process.env.STOCK_THRESHOLD_SWEEP_MS;
    const intervalMs =
      raw !== undefined && raw !== ''
        ? parseInt(raw, 10)
        : DEFAULT_INTERVAL_MS;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log('Stock threshold sweep disabled (STOCK_THRESHOLD_SWEEP_MS<=0 or invalid)');
      return;
    }
    const firstDelay = Math.min(60_000, intervalMs);
    this.firstTimeout = setTimeout(() => {
      void this.runSweep().catch((e) =>
        this.logger.warn(`Initial stock sweep failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, firstDelay);
    this.interval = setInterval(() => {
      void this.runSweep().catch((e) =>
        this.logger.warn(`Stock sweep failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, intervalMs);
    this.logger.log(`Stock threshold sweep every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    if (this.firstTimeout) {
      clearTimeout(this.firstTimeout);
      this.firstTimeout = undefined;
    }
  }

  private async runSweep(): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT company_id AS "companyId" FROM stock_levels`,
    ) as Array<{ companyId: string }>;
    const companyIds = rows.map((r) => String(r.companyId || '').trim()).filter(Boolean);
    let emitted = 0;
    const notificationsEnabled =
      this.notificationPublisher.isStockNotificationsEnabled();
    for (const companyId of companyIds) {
      const levels = await this.dataSource.getRepository(StockLevel).find({
        where: { companyId },
        relations: ['variant', 'variant.product'],
      });
      const storageIds = [...new Set(levels.map((sl) => sl.storageId).filter(Boolean))];
      const storageRows = storageIds.length
        ? await this.dataSource.getRepository(Storage).find({
            where: { id: In(storageIds) },
            select: { id: true, name: true },
          })
        : [];
      const storageNameById = new Map(
        storageRows.map((s) => [s.id, s.name ?? null] as const),
      );

      const totalsByVariant = new Map<string, number>();
      for (const sl of levels) {
        const vid = String(sl.productVariantId || '').trim();
        if (!vid) continue;
        totalsByVariant.set(
          vid,
          (totalsByVariant.get(vid) ?? 0) +
            Math.max(0, Number(sl.physicalStock ?? 0) || 0),
        );
      }

      for (const sl of levels) {
        if (!sl.variant) {
          continue;
        }
        const totalPhysicalStock = hasStorageSpecificMinimum(sl)
          ? undefined
          : totalsByVariant.get(sl.productVariantId) ??
            Math.max(0, Number(sl.physicalStock ?? 0) || 0);
        const payload = buildStockUpdatedPayload(
          companyId,
          sl.variant,
          sl,
          sl.lastTransactionId ?? null,
          { totalPhysicalStock },
        );
        if (payload.alerts.length === 0) {
          continue;
        }
        this.publisher.emitStockUpdated(payload);
        emitted += 1;

        if (notificationsEnabled) {
          const cmds = this.stockNotificationEvaluator.evaluate({
            companyId,
            variant: sl.variant,
            stockLevel: sl,
            transactionId: sl.lastTransactionId ?? null,
            storageName: storageNameById.get(sl.storageId) ?? null,
            totalPhysicalStock,
          });
          for (const cmd of cmds) {
            try {
              await this.notificationPublisher.publish(cmd);
            } catch (e) {
              this.logger.warn(
                `Sweep notification publish failed: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
        }
      }
    }
    if (emitted > 0) {
      this.logger.debug(`Stock threshold sweep emitted ${emitted} payload(s)`);
    }
  }
}
