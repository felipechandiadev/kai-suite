import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../domain/transaction.entity';
import type { TransactionBackorderMetadata } from '../domain/transaction-backorder.metadata';
import type {
  EShopFulfillmentStatus,
  TransactionEShopOrderMetadata,
} from '@modules/transactions/domain/transaction-eshop-order.metadata';

@Injectable()
export class EshopBackorderSyncService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  isEshopSource(metadata: Record<string, unknown> | null | undefined): boolean {
    return String(metadata?.source ?? '') === 'e-shop';
  }

  /**
   * Tras liquidar encargo en POS: marca reserva FULFILLED (ya hecho) y pedido web DELIVERED.
   */
  async syncOnBackorderFulfilled(
    backorderId: string,
    sale: { id: string; documentNumber: string },
  ): Promise<void> {
    const backorder = await this.txRepo.findOne({ where: { id: backorderId } });
    if (!backorder) return;
    const meta = { ...(backorder.metadata ?? {}) } as Record<string, unknown>;
    if (!this.isEshopSource(meta)) return;

    const eShopOrder = {
      ...((meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata),
    };
    const now = new Date().toISOString();
    eShopOrder.fulfillmentStatus = 'DELIVERED';
    eShopOrder.statusHistory = [
      ...(eShopOrder.statusHistory ?? []),
      {
        status: 'DELIVERED' as EShopFulfillmentStatus,
        at: now,
        note: `Liquidado en venta ${sale.documentNumber}`,
      },
    ];
    meta.eShopOrder = eShopOrder;

    const bo = {
      ...((meta.backorder ?? {}) as TransactionBackorderMetadata),
    };
    bo.reservationStatus = 'FULFILLED';
    bo.fulfilledByTransactionId = sale.id;
    bo.fulfilledByDocumentNumber = sale.documentNumber?.trim() || null;
    meta.backorder = bo;

    backorder.metadata = meta;
    await this.txRepo.save(backorder);
  }

  /**
   * Tras anular encargo: alinea pedido web a CANCELLED.
   */
  async syncOnBackorderCancelled(backorderId: string, reason?: string | null): Promise<void> {
    const backorder = await this.txRepo.findOne({ where: { id: backorderId } });
    if (!backorder) return;
    const meta = { ...(backorder.metadata ?? {}) } as Record<string, unknown>;
    if (!this.isEshopSource(meta)) return;

    const eShopOrder = {
      ...((meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata),
    };
    if (eShopOrder.fulfillmentStatus === 'CANCELLED') {
      return;
    }
    const now = new Date().toISOString();
    eShopOrder.fulfillmentStatus = 'CANCELLED';
    eShopOrder.statusHistory = [
      ...(eShopOrder.statusHistory ?? []),
      {
        status: 'CANCELLED' as EShopFulfillmentStatus,
        at: now,
        note: reason?.trim() || 'Encargo anulado',
      },
    ];
    meta.eShopOrder = eShopOrder;
    backorder.metadata = meta;
    await this.txRepo.save(backorder);
  }

  /**
   * Cuando admin cancela solo logística eShop: marca encargo CANCELLED (sin liberar stock aquí).
   */
  async syncBackorderOnEshopFulfillmentCancelled(
    transactionId: string,
    note?: string | null,
  ): Promise<void> {
    const tx = await this.txRepo.findOne({ where: { id: transactionId } });
    if (!tx) return;
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    if (!this.isEshopSource(meta)) return;

    const bo = {
      ...((meta.backorder ?? {}) as TransactionBackorderMetadata),
    };
    if (bo.reservationStatus === 'FULFILLED' || bo.reservationStatus === 'CANCELLED') {
      return;
    }
    bo.reservationStatus = 'CANCELLED';
    bo.cancelledAt = new Date().toISOString();
    bo.cancelReason = note?.trim() || 'Pedido web cancelado';
    meta.backorder = bo;
    tx.metadata = meta;
    await this.txRepo.save(tx);
  }
}
