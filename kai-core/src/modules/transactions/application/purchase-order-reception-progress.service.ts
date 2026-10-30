import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';

export interface PurchaseOrderProgressLine {
  productVariantId: string;
  productName: string | null;
  ordered: number;
  received: number;
  pending: number;
}

export interface PurchaseOrderProgress {
  purchaseOrderId: string;
  status: TransactionStatus;
  lines: PurchaseOrderProgressLine[];
}

/** Estados de la OC que la recepción no debe tocar. */
const FROZEN_STATUSES = [
  TransactionStatus.DRAFT,
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];
const IGNORED_PURCHASE_STATUSES = [
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
];
const EPS = 1e-6;

/**
 * Estado de recepción de una orden de compra (CONFIRMED → PARTIALLY_RECEIVED → RECEIVED).
 *
 * Se **recalcula** desde cero a partir de los ingresos (PURCHASE) vinculados a la OC y no anulados,
 * por lo que es idempotente y se corrige solo al crear o anular una recepción.
 * Las cantidades se comparan por variante, en la unidad de la línea (la misma de la OC).
 */
@Injectable()
export class PurchaseOrderReceptionProgressService {
  private readonly logger = new Logger(PurchaseOrderReceptionProgressService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  /** Lectura sin efectos: avance por línea y estado que le correspondería a la OC. */
  async getProgress(
    purchaseOrderId: string,
    manager?: EntityManager,
  ): Promise<PurchaseOrderProgress | null> {
    const repo = manager ? manager.getRepository(Transaction) : this.txRepo;
    const po = await repo.findOne({
      where: { id: purchaseOrderId, transactionType: TransactionType.PURCHASE_ORDER },
      relations: ['lines'],
    });
    if (!po) return null;
    return this.compute(repo, po);
  }

  /**
   * Recalcula y guarda el estado de la OC. No hace nada si la OC no existe o está en borrador/anulada.
   * Los errores se registran y no se propagan: no deben romper la recepción ni su anulación.
   */
  async recalculate(
    purchaseOrderId: string | null | undefined,
    manager?: EntityManager,
  ): Promise<PurchaseOrderProgress | null> {
    const id = purchaseOrderId?.trim();
    if (!id) return null;
    try {
      const repo = manager ? manager.getRepository(Transaction) : this.txRepo;
      const po = await repo.findOne({
        where: { id, transactionType: TransactionType.PURCHASE_ORDER },
        relations: ['lines'],
      });
      if (!po || FROZEN_STATUSES.includes(po.status)) return null;

      const progress = await this.compute(repo, po);
      const metadata = (po.metadata ?? {}) as Record<string, unknown>;
      po.status = progress.status;
      po.metadata = {
        ...metadata,
        receptionProgress: {
          updatedAt: new Date().toISOString(),
          lines: progress.lines,
        },
      } as any;
      await repo.save(po);
      return progress;
    } catch (e) {
      this.logger.error(
        `No se pudo recalcular el estado de recepción de la OC ${id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  private async compute(
    repo: Repository<Transaction>,
    po: Transaction,
  ): Promise<PurchaseOrderProgress> {
    const purchases = await repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.lines', 'l')
      .where('t.transactionType = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status NOT IN (:...ignored)', { ignored: IGNORED_PURCHASE_STATUSES })
      .andWhere(`(t.metadata::jsonb -> 'links' ->> 'purchaseOrderId') = :poId`, {
        poId: po.id,
      })
      .getMany();

    const received = new Map<string, number>();
    for (const p of purchases) {
      for (const l of p.lines ?? []) {
        if (!l.productVariantId) continue;
        received.set(
          l.productVariantId,
          (received.get(l.productVariantId) ?? 0) + (Number(l.quantity) || 0),
        );
      }
    }

    const ordered = new Map<string, { qty: number; name: string | null }>();
    for (const l of po.lines ?? []) {
      if (!l.productVariantId) continue;
      const cur = ordered.get(l.productVariantId);
      ordered.set(l.productVariantId, {
        qty: (cur?.qty ?? 0) + (Number(l.quantity) || 0),
        name: cur?.name ?? l.productName ?? null,
      });
    }

    const lines: PurchaseOrderProgressLine[] = [];
    let anyReceived = false;
    let allComplete = ordered.size > 0;
    for (const [variantId, o] of ordered) {
      const r = received.get(variantId) ?? 0;
      if (r > EPS) anyReceived = true;
      if (r + EPS < o.qty) allComplete = false;
      lines.push({
        productVariantId: variantId,
        productName: o.name,
        ordered: o.qty,
        received: r,
        pending: Math.max(0, o.qty - r),
      });
    }

    const status =
      anyReceived && allComplete
        ? TransactionStatus.RECEIVED
        : anyReceived
          ? TransactionStatus.PARTIALLY_RECEIVED
          : TransactionStatus.CONFIRMED;

    return { purchaseOrderId: po.id, status, lines };
  }
}
