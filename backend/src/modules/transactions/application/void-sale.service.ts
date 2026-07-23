import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  PaymentMethod,
  PaymentStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';
import {
  Installment,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { DocumentNumberService } from './document-number.service';
import { CacheService } from '@shared/cache/cache.service';

const FISCAL_DOCUMENT_TYPES = new Set(['BOLETA', 'FACTURA']);

export type VoidSaleResult = {
  sale: {
    id: string;
    documentNumber: string;
    status: string;
  };
  voidAdjustmentId: string | null;
  stockAdjustmentId: string | null;
  voidedPaymentIds: string[];
};

@Injectable()
export class VoidSaleService {
  private readonly logger = new Logger(VoidSaleService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    private readonly documentNumbers: DocumentNumberService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async void(
    companyId: string,
    userId: string,
    saleId: string,
    dto: VoidSaleDto,
  ): Promise<VoidSaleResult> {
    const cid = companyId?.trim();
    const id = saleId?.trim();
    const uid = userId?.trim();
    const reason = String(dto.reason ?? '').trim();

    if (!cid || !id) {
      throw new BadRequestException('Identificador de venta inválido');
    }
    if (!uid) {
      throw new BadRequestException('Usuario requerido para anular la venta');
    }
    if (reason.length < 3) {
      throw new BadRequestException(
        'Indique un motivo de anulación (mín. 3 caracteres).',
      );
    }

    const sale = await this.txRepo.findOne({
      where: {
        id,
        companyId: cid,
        transactionType: TransactionType.SALE,
      },
      relations: ['lines'],
    });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    this.assertCanVoid(sale);
    await this.assertNoSaleReturns(cid, id);

    const voidedAt = new Date().toISOString();
    let stockAdjustmentId: string | null = null;
    let voidAdjustmentId: string | null = null;
    const voidedPaymentIds: string[] = [];

    // Stock restore via ADJUSTMENT_IN (triggers UpdateStock automation).
    if (sale.storageId && (sale.lines?.length ?? 0) > 0) {
      const hasStockLines = sale.lines!.some(
        (l) => l.productVariantId && (Number(l.quantity) || 0) > 0,
      );
      if (hasStockLines) {
        const stockAdj = await this.createStockRestoreAdjustment(
          sale,
          uid,
          reason,
        );
        stockAdjustmentId = stockAdj.id;
      }
    }

    // Traceable VOID_ADJUSTMENT (saved directly; DTO forbids negative totals).
    const voidAdj = await this.createVoidAdjustment(sale, uid, reason);
    voidAdjustmentId = voidAdj.id;

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Transaction).findOne({
        where: { id, companyId: cid },
        relations: ['lines'],
      });
      if (!locked) {
        throw new NotFoundException('Venta no encontrada');
      }
      this.assertCanVoid(locked);

      const payments = await this.findChildPaymentsWithManager(manager, cid, id);
      for (const pay of payments) {
        if (
          pay.status === TransactionStatus.VOIDED ||
          pay.status === TransactionStatus.CANCELLED
        ) {
          continue;
        }
        pay.status = TransactionStatus.VOIDED;
        pay.paymentStatus = PaymentStatus.VOIDED;
        const payMeta = { ...(pay.metadata ?? {}) } as Record<string, unknown>;
        payMeta.void = {
          reason,
          voidedAt,
          voidedBy: uid,
          voidOfSaleId: id,
        };
        pay.metadata = payMeta;
        const notes = String(pay.notes ?? '').trim();
        pay.notes = notes
          ? `${notes}\nVOIDED: ${reason}`
          : `VOIDED: ${reason}`;
        await manager.getRepository(Transaction).save(pay);
        voidedPaymentIds.push(pay.id);
      }

      await this.cancelOpenInstallments(manager, id, reason, voidedAt, uid);

      locked.status = TransactionStatus.VOIDED;
      locked.paymentStatus = PaymentStatus.VOIDED;
      const meta = { ...(locked.metadata ?? {}) } as Record<string, unknown>;
      meta.void = {
        reason,
        voidedAt,
        voidedBy: uid,
        voidAdjustmentId,
        stockAdjustmentId,
        voidedPaymentIds: [...voidedPaymentIds],
      };
      locked.metadata = meta;
      const saleNotes = String(locked.notes ?? '').trim();
      locked.notes = saleNotes
        ? `${saleNotes}\nVOIDED: ${reason}`
        : `VOIDED: ${reason}`;
      await manager.getRepository(Transaction).save(locked);

      if (locked.cashSessionId) {
        await this.adjustCashSessionExpected(
          manager,
          locked.cashSessionId,
          payments,
        );
      }
    });

    await this.revertPromotionRedemptions(id, voidAdjustmentId, reason);

    try {
      await this.cacheService?.invalidateTransactionDetails(id);
      if (sale.customerId) {
        await this.cacheService?.invalidateCustomerCache(sale.customerId);
      }
      const day = sale.createdAt?.toISOString?.().slice(0, 10);
      if (day) {
        await this.cacheService?.invalidateTransactionSummary(day);
        await this.cacheService?.invalidateDailySales(day);
      }
    } catch (e) {
      this.logger.warn(
        `Cache invalidate after void sale failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    return {
      sale: {
        id: sale.id,
        documentNumber: String(sale.documentNumber ?? sale.id),
        status: TransactionStatus.VOIDED,
      },
      voidAdjustmentId,
      stockAdjustmentId,
      voidedPaymentIds,
    };
  }

  private assertCanVoid(sale: Transaction): void {
    if (
      sale.status === TransactionStatus.VOIDED ||
      sale.status === TransactionStatus.CANCELLED
    ) {
      throw new BadRequestException('La venta ya está anulada');
    }
    if (sale.status === TransactionStatus.DRAFT) {
      throw new BadRequestException(
        'No se puede anular una venta en borrador',
      );
    }

    const docType = String(sale.documentType ?? '')
      .trim()
      .toUpperCase();
    if (FISCAL_DOCUMENT_TYPES.has(docType)) {
      throw new BadRequestException(
        'Esta venta tiene documento tributario (boleta/factura). Anúlela con nota de crédito fiscal / devolución; no se puede anular operativamente desde aquí.',
      );
    }
  }

  private async assertNoSaleReturns(
    companyId: string,
    saleId: string,
  ): Promise<void> {
    const count = await this.txRepo.count({
      where: {
        companyId,
        transactionType: TransactionType.SALE_RETURN,
        relatedTransactionId: saleId,
      },
    });
    if (count > 0) {
      throw new BadRequestException(
        'La venta tiene devoluciones asociadas y no puede anularse. Gestione la devolución existente.',
      );
    }
  }

  private async cancelOpenInstallments(
    manager: EntityManager,
    saleId: string,
    reason: string,
    voidedAt: string,
    voidedBy: string,
  ): Promise<void> {
    const repo = manager.getRepository(Installment);
    const open = await repo.find({
      where: [
        {
          saleTransactionId: saleId,
          status: In([
            InstallmentStatus.PENDING,
            InstallmentStatus.PARTIAL,
            InstallmentStatus.OVERDUE,
          ]),
        },
        {
          sourceTransactionId: saleId,
          status: In([
            InstallmentStatus.PENDING,
            InstallmentStatus.PARTIAL,
            InstallmentStatus.OVERDUE,
          ]),
        },
      ],
    });
    const byId = new Map<string, Installment>();
    for (const inst of open) {
      byId.set(inst.id, inst);
    }
    for (const inst of byId.values()) {
      const meta = { ...(inst.metadata ?? {}) } as Record<string, unknown>;
      meta.cancelledBySaleVoid = {
        reason,
        voidedAt,
        voidedBy,
        voidOfSaleId: saleId,
      };
      inst.metadata = meta;
      // Cierra la cuota en cartera (no hay estado CANCELLED en installments).
      inst.amountPaid = Number(inst.amount) || 0;
      inst.status = InstallmentStatus.PAID;
      await repo.save(inst);
    }
  }

  private async findChildPaymentsWithManager(
    manager: EntityManager,
    companyId: string,
    saleId: string,
  ): Promise<Transaction[]> {
    const repo = manager.getRepository(Transaction);
    const byRelated = await repo.find({
      where: {
        companyId,
        transactionType: TransactionType.PAYMENT_IN,
        relatedTransactionId: saleId,
      },
    });
    const byMeta = await repo
      .createQueryBuilder('t')
      .where('t.company_id = :companyId', { companyId })
      .andWhere('t.transaction_type = :type', {
        type: TransactionType.PAYMENT_IN,
      })
      .andWhere(`t.metadata->>'saleTransactionId' = :saleId`, { saleId })
      .getMany();
    const byId = new Map<string, Transaction>();
    for (const p of [...byRelated, ...byMeta]) {
      byId.set(p.id, p);
    }
    return [...byId.values()];
  }

  private async createStockRestoreAdjustment(
    sale: Transaction,
    userId: string,
    reason: string,
  ): Promise<Transaction> {
    const lines = (sale.lines ?? []).filter(
      (l) => l.productVariantId && (Number(l.quantity) || 0) > 0,
    );
    if (!lines.length || !sale.storageId) {
      throw new BadRequestException(
        'La venta no tiene líneas/almacén para restaurar stock',
      );
    }

    const dto = new CreateTransactionDto();
    const mappedLines = lines.map((l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const lineTotal = Math.round(qty * price);
      return {
        productId: l.productId ?? undefined,
        productVariantId: l.productVariantId!,
        productName: l.productName || 'Producto',
        productSku: l.productSku ?? undefined,
        quantity: qty,
        quantityInBase:
          l.quantityInBase != null ? Number(l.quantityInBase) : undefined,
        unitPrice: price,
        unitCost: l.unitCost != null ? Number(l.unitCost) : undefined,
        taxRate: 0,
        taxAmount: 0,
        discountAmount: 0,
        discountPercentage: 0,
        subtotal: lineTotal,
        total: lineTotal,
      };
    });
    const total = mappedLines.reduce((s, l) => s + l.total, 0);

    Object.assign(dto, {
      transactionType: TransactionType.ADJUSTMENT_IN,
      companyId: sale.companyId,
      branchId: sale.branchId,
      userId,
      storageId: sale.storageId,
      relatedTransactionId: sale.id,
      pointOfSaleId: sale.pointOfSaleId ?? undefined,
      cashSessionId: sale.cashSessionId ?? undefined,
      subtotal: total,
      taxAmount: 0,
      discountAmount: 0,
      total,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      amountPaid: 0,
      notes: `Reingreso por anulación de venta ${sale.documentNumber ?? sale.id}: ${reason}`,
      metadata: {
        origin: 'SALE_VOID',
        voidOfSaleId: sale.id,
        reason,
      },
      lines: mappedLines,
    });

    return this.transactionsService.createTransaction(dto);
  }

  private async createVoidAdjustment(
    sale: Transaction,
    userId: string,
    reason: string,
  ): Promise<Transaction> {
    if (!sale.branchId) {
      throw new BadRequestException(
        'La venta no tiene sucursal para registrar la anulación',
      );
    }
    const docNumber = await this.documentNumbers.allocateNext(
      sale.branchId,
      TransactionType.VOID_ADJUSTMENT,
      sale.companyId,
    );

    const voidTx = this.txRepo.create({
      companyId: sale.companyId,
      branchId: sale.branchId,
      userId,
      documentNumber: docNumber,
      transactionType: TransactionType.VOID_ADJUSTMENT,
      status: TransactionStatus.CONFIRMED,
      relatedTransactionId: sale.id,
      customerId: sale.customerId ?? undefined,
      pointOfSaleId: sale.pointOfSaleId ?? undefined,
      cashSessionId: sale.cashSessionId ?? undefined,
      cashHubId: sale.cashHubId ?? undefined,
      storageId: sale.storageId ?? undefined,
      subtotal: -Math.round(Number(sale.subtotal) || 0),
      taxAmount: -Math.round(Number(sale.taxAmount) || 0),
      discountAmount: -Math.round(Number(sale.discountAmount) || 0),
      total: -Math.round(Number(sale.total) || 0),
      paymentMethod: sale.paymentMethod ?? PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      amountPaid: 0,
      notes: `Anulación de venta ${sale.documentNumber ?? sale.id}: ${reason}`,
      metadata: {
        origin: 'SALE_VOID',
        voidOfSaleId: sale.id,
        voidReason: reason,
        originalTransactionType: sale.transactionType,
      },
    });

    return this.txRepo.save(voidTx);
  }

  private async adjustCashSessionExpected(
    manager: EntityManager,
    cashSessionId: string,
    payments: Transaction[],
  ): Promise<void> {
    const cashTotal = payments
      .filter(
        (p) =>
          p.paymentMethod === PaymentMethod.CASH &&
          p.status !== TransactionStatus.VOIDED &&
          p.status !== TransactionStatus.CANCELLED,
      )
      .reduce((s, p) => s + Math.round(Number(p.total) || 0), 0);
    if (cashTotal <= 0) return;
    try {
      await manager.query(
        `UPDATE cash_sessions
            SET expected_amount = GREATEST(COALESCE(expected_amount, 0) - $1, 0)
          WHERE id = $2 AND deleted_at IS NULL`,
        [cashTotal, cashSessionId],
      );
    } catch (e) {
      this.logger.warn(
        `Cash session expectedAmount adjust failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  private async revertPromotionRedemptions(
    originalTransactionId: string,
    voidTransactionId: string | null,
    reason: string,
  ): Promise<void> {
    if (!voidTransactionId) return;
    try {
      const redemptions = await this.dataSource.query<
        {
          id: string;
          company_id: string;
          promotion_id: string;
          customer_id: string | null;
          amount_discounted: string;
          snapshot: Record<string, unknown>;
        }[]
      >(
        `SELECT id, company_id, promotion_id, customer_id, amount_discounted, snapshot
           FROM promotion_redemptions
          WHERE transaction_id = $1
            AND amount_discounted > 0`,
        [originalTransactionId],
      );
      for (const r of redemptions ?? []) {
        const amount = Number(r.amount_discounted) || 0;
        await this.dataSource.query(
          `INSERT INTO promotion_redemptions
             (company_id, promotion_id, transaction_id, customer_id,
              amount_discounted, snapshot, applied_at)
           VALUES ($1, $2, $3, $4, $5, $6, now())`,
          [
            r.company_id,
            r.promotion_id,
            voidTransactionId,
            r.customer_id,
            -amount,
            {
              ...(r.snapshot ?? {}),
              reversal: true,
              reversalOf: r.id,
              reversalReason: reason,
            },
          ],
        );
        await this.dataSource.query(
          `UPDATE promotions
              SET uses_count = GREATEST(uses_count - 1, 0),
                  updated_at = now()
            WHERE id = $1`,
          [r.promotion_id],
        );
      }
    } catch {
      // Promotions tables may not exist in all envs.
    }
  }
}
