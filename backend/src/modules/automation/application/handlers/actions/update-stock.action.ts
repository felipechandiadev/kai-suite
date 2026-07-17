import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { appendPmpHistory } from '@modules/product-variants/application/helpers/pmp-history';
import {
  costPerStockBaseUnit,
  resolvePmpAfterValuedInbound,
  totalInventoryLineCost,
} from '@modules/product-variants/application/helpers/inventory-cost-from-line';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';
import { StockRealtimePublisher } from '@modules/stock-realtime/stock-realtime.publisher';
import type { StockUpdatedPayload } from '@modules/stock-realtime/stock-realtime.types';
import { buildStockUpdatedPayload } from '@modules/stock-realtime/stock-threshold-alert-payload.util';
import {
  hasStorageSpecificMinimum,
  sumVariantPhysicalStock,
} from '@modules/stock-realtime/stock-threshold-resolution.util';
import { StockNotificationEvaluator } from '@modules/notifications/application/stock-notification.evaluator';
import { NotificationPublisherService } from '@modules/notifications/application/notification-publisher.service';
import type { PublishNotificationCommand } from '@modules/notifications/application/dto/publish-notification.command';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ReceptionLine } from '@modules/receptions/domain/reception-line.entity';
import {
  getReceptionIdFromTransactionMetadata,
  mapTransactionLineIdToReceptionLineId,
} from '../../helpers/reception-stock-snapshot.util';

@Injectable()
export class UpdateStockActionHandler {
  private readonly logger = new Logger(UpdateStockActionHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly stockRealtime: StockRealtimePublisher,
    private readonly stockNotificationEvaluator: StockNotificationEvaluator,
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const tx = ctx.payload?.transaction as Transaction;
    if (!tx?.id) return;

    const type = tx.transactionType;
    const incomingTypes = [
      TransactionType.PURCHASE,
      TransactionType.SALE_RETURN,
      TransactionType.TRANSFER_IN,
      TransactionType.ADJUSTMENT_IN,
    ];
    const outgoingTypes = [
      TransactionType.SALE,
      TransactionType.TRANSFER_OUT,
      TransactionType.ADJUSTMENT_OUT,
    ];
    /** pwa-stock /inventory: alertas las publica InventoryService (evita duplicados). */
    const inventoryMovementTypes = [
      TransactionType.ADJUSTMENT_IN,
      TransactionType.ADJUSTMENT_OUT,
      TransactionType.TRANSFER_IN,
      TransactionType.TRANSFER_OUT,
    ];
    if (![...incomingTypes, ...outgoingTypes].includes(type)) {
      return;
    }

    /**
     * PMP se actualiza en:
     * - PURCHASE valorada
     * - ADJUSTMENT_IN con origin PRODUCTION_OUTPUT (entrada valorada de producción)
     */
    const rawOrigin = tx?.metadata?.origin;
    const metaOrigin = typeof rawOrigin === 'string' ? rawOrigin : null;
    const updatesPmpFromTransaction =
      type === TransactionType.PURCHASE ||
      (type === TransactionType.ADJUSTMENT_IN && metaOrigin === 'PRODUCTION_OUTPUT');

    const stockEmitMap = new Map<string, StockUpdatedPayload>();
    const pendingNotifications: PublishNotificationCommand[] = [];

    await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const txFull = await txRepo.findOne({
        where: { id: tx.id },
        relations: ['lines'] as any,
      });
      const lines = (txFull && (txFull as any).lines) || (tx as any).lines || [];

      const stockRepo = manager.getRepository(StockLevel);
      const storageId = tx.storageId ?? tx.targetStorageId ?? null;
      if (!storageId) {
        this.logger.warn(
          `Transaction ${tx.id} has no storageId; skipping inventory update. ruleId=${rule?.id}`,
        );
        return;
      }

      const txMeta = (txFull && (txFull as any).metadata) || (tx as any).metadata || {};
      const receptionId = getReceptionIdFromTransactionMetadata(txMeta);
      let txLineToReceptionLineId = new Map<string, string>();
      if (receptionId && type === TransactionType.PURCHASE) {
        const receptionLines = await manager.getRepository(ReceptionLine).find({
          where: { receptionId },
          order: { lineNumber: 'ASC' },
        });
        txLineToReceptionLineId = mapTransactionLineIdToReceptionLineId(
          receptionLines,
          lines as Array<{ id?: string; lineNumber?: number }>,
        );
      }

      const setAbsolutePhysical =
        (txMeta.inventoryAdjustMode === 'set_absolute' ||
          txMeta.inventoryAdjustMode === 'set') &&
        txMeta.targetPhysicalStock != null &&
        Number.isFinite(Number(txMeta.targetPhysicalStock));

      const variantIds = [
        ...new Set(
          (lines as any[])
            .map((l) => l.productVariantId)
            .filter((id: string | undefined): id is string => Boolean(id)),
        ),
      ];
      const globalStockBeforeTx = new Map<string, number>();
      if (variantIds.length > 0) {
        const sums = await stockRepo
          .createQueryBuilder('sl')
          .select('sl.productVariantId', 'variantId')
          .addSelect('COALESCE(SUM(sl.physicalStock), 0)', 'qty')
          .where('sl.productVariantId IN (:...ids)', { ids: variantIds })
          .groupBy('sl.productVariantId')
          .getRawMany();
        for (const row of sums) {
          const r = row as Record<string, unknown>;
          const vid = String(
            r.variantId ??
              r.sl_productVariantId ??
              r.productVariantId ??
              r.product_variant_id ??
              '',
          ).trim();
          if (!vid) continue;
          const qty = Number(r.qty ?? r.sum ?? 0) || 0;
          globalStockBeforeTx.set(vid, qty);
        }
        for (const id of variantIds) {
          if (!globalStockBeforeTx.has(id)) {
            globalStockBeforeTx.set(id, 0);
          }
        }
      }

      type PmpAcc = { inQty: number; inCost: number; outQty: number };
      const pmpAccByVariant = new Map<string, PmpAcc>();

      for (const line of lines) {
        const variantId = line.productVariantId;
        const qtyLine = Number(line.quantity ?? line.receivedQuantity ?? 0) || 0;
        const qtyBaseRaw =
          line.quantityInBase != null && line.quantityInBase !== ''
            ? Number(line.quantityInBase)
            : qtyLine;
        const qtyBase = Number.isFinite(qtyBaseRaw) ? qtyBaseRaw : qtyLine;

        let moveQty = qtyBase;
        if (outgoingTypes.includes(type)) {
          moveQty = -qtyBase;
        }
        if (!variantId || moveQty === 0) continue;

        let companyIdForStock = ctx.companyId;
        const variantRow = await manager.getRepository(ProductVariant).findOne({
          where: { id: variantId },
          relations: ['product'],
        });
        if (variantRow?.companyId) {
          companyIdForStock = variantRow.companyId;
        }

        let stockEntry = (await stockRepo.findOne({
          where: { productVariantId: variantId, storageId } as any,
        })) as StockLevel | null;
        const storagePhysicalBefore = stockEntry
          ? Number(stockEntry.physicalStock ?? 0)
          : 0;
        const targetPhysical = setAbsolutePhysical
          ? Math.max(0, Number(txMeta.targetPhysicalStock) || 0)
          : null;

        if (!stockEntry) {
          const physical =
            targetPhysical != null ? targetPhysical : Math.max(0, moveQty);
          stockEntry = stockRepo.create({
            companyId: companyIdForStock,
            productVariantId: variantId,
            storageId,
            physicalStock: physical,
            committedStock: 0,
            availableStock: physical,
            incomingStock: 0,
            lastTransactionId: tx.id,
          } as any) as unknown as StockLevel;
        } else if (targetPhysical != null) {
          stockEntry.physicalStock = Number(targetPhysical.toFixed(6));
          stockEntry.availableStock = Number(
            (
              Number(stockEntry.physicalStock ?? 0) -
              Number(stockEntry.committedStock ?? 0)
            ).toFixed(6),
          );
          stockEntry.lastTransactionId = tx.id;
        } else {
          stockEntry.physicalStock = Number(
            (Number(stockEntry.physicalStock ?? 0) + moveQty).toFixed(6),
          );
          stockEntry.availableStock = Number(
            (
              Number(stockEntry.physicalStock ?? 0) -
              Number(stockEntry.committedStock ?? 0)
            ).toFixed(6),
          );
          stockEntry.lastTransactionId = tx.id;
        }

        const storagePhysicalAfter = Number(stockEntry.physicalStock ?? 0);

        await stockRepo.save(stockEntry as StockLevel);

        if (receptionId && type === TransactionType.PURCHASE) {
          const txLineId = typeof line.id === 'string' ? line.id.trim() : '';
          const receptionLineId = txLineId
            ? txLineToReceptionLineId.get(txLineId)
            : undefined;
          if (receptionLineId) {
            await manager.getRepository(ReceptionLine).update(
              { id: receptionLineId },
              {
                storagePhysicalBefore: Number(storagePhysicalBefore.toFixed(6)),
                storagePhysicalAfter: Number(storagePhysicalAfter.toFixed(6)),
              },
            );
          }
        }

        let totalPhysicalStock: number | undefined;
        if (!hasStorageSpecificMinimum(stockEntry as StockLevel)) {
          const levelRows = await stockRepo.find({
            where: {
              companyId: companyIdForStock,
              productVariantId: variantId,
            },
            select: ['storageId', 'physicalStock'],
          });
          totalPhysicalStock = sumVariantPhysicalStock(levelRows, {
            storageId,
            physical: Number(stockEntry.physicalStock ?? 0),
          });
        }

        const payload = buildStockUpdatedPayload(
          companyIdForStock,
          variantRow,
          stockEntry as StockLevel,
          tx.id,
          { totalPhysicalStock },
        );
        stockEmitMap.set(`${storageId}:${variantId}`, payload);

        if (
          payload.alerts.length > 0 &&
          !inventoryMovementTypes.includes(type) &&
          this.notificationPublisher.isStockNotificationsEnabled()
        ) {
          const storageRow = await manager.getRepository(Storage).findOne({
            where: { id: storageId },
            select: { id: true, name: true },
          });
          const cmds = this.stockNotificationEvaluator.evaluate({
            companyId: companyIdForStock,
            variant: variantRow,
            stockLevel: stockEntry as StockLevel,
            transactionId: tx.id,
            storageName: storageRow?.name ?? null,
            totalPhysicalStock,
          });
          pendingNotifications.push(...cmds);
        }

        if (updatesPmpFromTransaction) {
          let acc = pmpAccByVariant.get(variantId);
          if (!acc) {
            acc = { inQty: 0, inCost: 0, outQty: 0 };
            pmpAccByVariant.set(variantId, acc);
          }
          if (moveQty < 0) {
            acc.outQty += Math.abs(moveQty);
          }
          const totalLineCost = totalInventoryLineCost(line);
          if (totalLineCost > 0 && moveQty > 0) {
            const costPerBase = costPerStockBaseUnit(totalLineCost, qtyBase);
            if (costPerBase > 0) {
              acc.inQty += qtyBase;
              acc.inCost += totalLineCost;
            }
          } else if (line.productVariantId && moveQty > 0) {
            this.logger.warn(
              `${type} ${tx.id}: línea variante ${line.productVariantId} sin costo; PMP no actualizado.`,
            );
          }
        }
      }

      if (updatesPmpFromTransaction) {
        const variantRepo = manager.getRepository(ProductVariant);
        for (const [variantId, acc] of pmpAccByVariant) {
          if (acc.inQty <= 0 || acc.inCost <= 0) {
            continue;
          }
          const variant = await variantRepo.findOne({ where: { id: variantId } });
          if (!variant) {
            continue;
          }
          const rawPmp = (variant as { pmp?: number | null }).pmp;
          const prevPmp =
            rawPmp != null &&
            Number.isFinite(Number(rawPmp)) &&
            Number(rawPmp) > 0
              ? Number(rawPmp)
              : null;
          const G0 = globalStockBeforeTx.get(variantId) ?? 0;
          const pmpResult = resolvePmpAfterValuedInbound({
            prevPmp,
            globalStockBefore: G0,
            outQtyBase: acc.outQty,
            inQtyBase: acc.inQty,
            inCostTotal: acc.inCost,
          });
          if (!pmpResult) {
            continue;
          }
          const newPmp = pmpResult.newPmp;
          const blendedUnitCost =
            acc.inQty > 0 ? Number((acc.inCost / acc.inQty).toFixed(6)) : undefined;
          (variant as any).pmp = newPmp;
          (variant as any).pmpHistory = appendPmpHistory((variant as any).pmpHistory, {
              previousPmp: prevPmp ?? 0,
              newPmp,
              source: prevPmp == null ? 'first_purchase' : 'transaction_cost',
              transactionId: tx.id,
              storageId,
              unitCost: blendedUnitCost,
              quantity: acc.inQty,
            },
          );
          await variantRepo.save(variant);
        }
      }
    });

    for (const payload of stockEmitMap.values()) {
      this.stockRealtime.emitStockUpdated(payload);
    }

    for (const cmd of pendingNotifications) {
      try {
        await this.notificationPublisher.publish(cmd);
      } catch (e) {
        this.logger.warn(
          `Notification publish failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}

