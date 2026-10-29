import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Reception, ReceptionStatus } from '../domain/reception.entity';
import {
  PaymentMethod,
  PaymentStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { appendPmpHistory } from '@modules/product-variants/application/helpers/pmp-history';
import {
  Installment,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';
import {
  AccountingPeriod,
  AccountingPeriodStatus,
} from '@modules/accounting-periods/domain/accounting-period.entity';
import {
  RECEPTION_VOID_ORIGIN,
  reverseLedgerEntries,
} from '@modules/ledger-entries/application/ledger-reversal.util';
import { CacheService } from '@shared/cache/cache.service';
import { VoidReceptionDto } from './dto/void-reception.dto';

const CLOSED_TX_STATUSES = [TransactionStatus.VOIDED, TransactionStatus.CANCELLED];
const OPEN_INSTALLMENT_STATUSES = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
];

export type VoidReceptionResult = {
  reception: { id: string; status: string };
  voidAdjustmentId: string | null;
  stockAdjustmentId: string | null;
  voidedDocumentIds: string[];
  voidedPaymentIds: string[];
  pmpRestoredVariantIds: string[];
  warnings: string[];
};

type PmpRestorePlan = {
  variantId: string;
  restoreTo: number | null;
  previousPmp: number;
  currentPmp: number;
  unitCost?: number;
  quantity?: number;
};

/**
 * Anulación de recepciones de compra (ver kai-core/docs/receptions-void-design.md).
 * No borra: marca VOIDED, baja el stock recibido, restaura PMP cuando es exacto y
 * espeja los asientos contables del ingreso.
 */
@Injectable()
export class ReceptionVoidService {
  private readonly logger = new Logger(ReceptionVoidService.name);

  constructor(
    @InjectRepository(Reception)
    private readonly receptionRepo: Repository<Reception>,
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
    receptionId: string,
    dto: VoidReceptionDto,
  ): Promise<VoidReceptionResult> {
    const cid = companyId?.trim();
    const id = receptionId?.trim();
    const uid = userId?.trim();
    const reason = String(dto.reason ?? '').trim();
    if (!cid || !id) {
      throw new BadRequestException('Identificador de recepción inválido');
    }
    if (!uid) {
      throw new BadRequestException('Usuario requerido para anular la recepción');
    }
    if (reason.length < 3) {
      throw new BadRequestException(
        'Indique un motivo de anulación (mín. 3 caracteres).',
      );
    }

    const reception = await this.receptionRepo.findOne({
      where: { id, companyId: cid },
    });
    if (!reception) {
      throw new NotFoundException('Recepción no encontrada');
    }
    this.assertNotVoided(reception);

    const purchase = reception.transactionId
      ? await this.txRepo.findOne({
          where: { id: reception.transactionId, companyId: cid },
          relations: ['lines'],
        })
      : null;

    const fiscalDocs = await this.findFiscalDocuments(cid, id);
    const parentIds = [
      ...(purchase ? [purchase.id] : []),
      ...fiscalDocs.map((d) => d.id),
    ];

    // --- Validaciones (todo se valida antes de tocar stock) ---
    const draftPayments = await this.assertNoConfirmedPayments(cid, parentIds);
    await this.assertNoReturns(cid, id, parentIds);
    await this.assertPeriodOpen(purchase);
    const warnings: string[] = [];
    const stockLines = this.collectStockLines(purchase);
    await this.assertStockAvailable(purchase, stockLines);
    const pmpPlans = await this.planPmpRestore(
      purchase,
      stockLines,
      dto.acknowledgePmpNotRestored === true,
      warnings,
    );

    // --- Efectos ---
    const voidedAt = new Date();
    let stockAdjustmentId: string | null = null;
    if (purchase && stockLines.size > 0 && purchase.storageId) {
      const adj = await this.createStockOutAdjustment(purchase, uid, reason);
      stockAdjustmentId = adj.id;
    }

    const voidedDocumentIds: string[] = [];
    const voidedPaymentIds: string[] = [];
    let voidAdjustmentId: string | null = null;
    const branchId = purchase?.branchId ?? reception.branchId ?? null;
    const voidDocNumber =
      purchase && branchId
        ? await this.documentNumbers.allocateNext(
            branchId,
            TransactionType.VOID_ADJUSTMENT,
            cid,
          )
        : null;

    try {
      await this.dataSource.transaction(async (manager) => {
        const locked = await manager.getRepository(Reception).findOne({
          where: { id, companyId: cid },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) {
          throw new NotFoundException('Recepción no encontrada');
        }
        this.assertNotVoided(locked);

        const txRepo = manager.getRepository(Transaction);

        // PMP
        const variantRepo = manager.getRepository(ProductVariant);
        for (const plan of pmpPlans) {
          const variant = await variantRepo.findOne({
            where: { id: plan.variantId },
          });
          if (!variant) continue;
          (variant as any).pmp = plan.restoreTo;
          (variant as any).pmpHistory = appendPmpHistory(
            (variant as any).pmpHistory,
            {
              previousPmp: plan.currentPmp,
              newPmp: plan.restoreTo ?? 0,
              source: 'void_reception',
              transactionId: purchase?.id,
              storageId: purchase?.storageId ?? undefined,
              unitCost: plan.unitCost,
              quantity: plan.quantity,
            },
          );
          await variantRepo.save(variant);
        }

        // VOID_ADJUSTMENT (traza) + reverso contable espejo
        if (purchase && voidDocNumber) {
          const voidTx = await txRepo.save(
            txRepo.create({
              companyId: cid,
              branchId: purchase.branchId,
              userId: uid,
              documentNumber: voidDocNumber,
              transactionType: TransactionType.VOID_ADJUSTMENT,
              status: TransactionStatus.CONFIRMED,
              relatedTransactionId: purchase.id,
              supplierId: purchase.supplierId ?? undefined,
              storageId: purchase.storageId ?? undefined,
              subtotal: -Math.round(Number(purchase.subtotal) || 0),
              taxAmount: -Math.round(Number(purchase.taxAmount) || 0),
              discountAmount: -Math.round(Number(purchase.discountAmount) || 0),
              total: -Math.round(Number(purchase.total) || 0),
              paymentMethod: purchase.paymentMethod ?? PaymentMethod.CASH,
              paymentStatus: PaymentStatus.PAID,
              amountPaid: 0,
              notes: `Anulación de recepción ${locked.documentNumber ?? locked.id}: ${reason}`,
              metadata: {
                origin: RECEPTION_VOID_ORIGIN,
                voidOfReceptionId: locked.id,
                voidReason: reason,
                originalTransactionType: purchase.transactionType,
                stockAdjustmentId,
              },
            }),
          );
          voidAdjustmentId = voidTx.id;
          await reverseLedgerEntries(manager, {
            originalTransactionId: purchase.id,
            reversalTransactionId: voidTx.id,
            reason,
            entryDate: voidedAt,
          });
          for (const doc of fiscalDocs) {
            await reverseLedgerEntries(manager, {
              originalTransactionId: doc.id,
              reversalTransactionId: voidTx.id,
              reason,
              entryDate: voidedAt,
            });
          }
        }

        const voidMeta = {
          reason,
          voidedAt: voidedAt.toISOString(),
          voidedBy: uid,
          voidOfReceptionId: locked.id,
          voidAdjustmentId,
          stockAdjustmentId,
        };

        // Cuotas programadas (DRAFT) y cuotas de cartera
        for (const pay of draftPayments) {
          await this.markVoided(txRepo, pay.id, voidMeta, reason);
          voidedPaymentIds.push(pay.id);
        }
        for (const doc of fiscalDocs) {
          await this.markVoided(txRepo, doc.id, voidMeta, reason);
          voidedDocumentIds.push(doc.id);
        }
        if (purchase) {
          await this.markVoided(txRepo, purchase.id, voidMeta, reason);
          voidedDocumentIds.push(purchase.id);
          await this.cancelOpenInstallments(manager, purchase.id, voidMeta);
        }

        locked.status = ReceptionStatus.VOIDED;
        locked.voidedAt = voidedAt;
        locked.voidedBy = uid;
        locked.voidReason = reason;
        locked.voidTransactionId = voidAdjustmentId;
        await manager.getRepository(Reception).save(locked);
      });
    } catch (err) {
      await this.compensateStock(purchase, stockAdjustmentId, uid, err);
      throw err;
    }

    try {
      await this.cacheService?.invalidateTransactionDetails(id);
      if (purchase) {
        await this.cacheService?.invalidateTransactionDetails(purchase.id);
      }
    } catch (e) {
      this.logger.warn(
        `Cache invalidate after void reception failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    return {
      reception: { id, status: ReceptionStatus.VOIDED },
      voidAdjustmentId,
      stockAdjustmentId,
      voidedDocumentIds,
      voidedPaymentIds,
      pmpRestoredVariantIds: pmpPlans.map((p) => p.variantId),
      warnings,
    };
  }

  private assertNotVoided(reception: Reception): void {
    if (reception.status === ReceptionStatus.VOIDED) {
      throw new BadRequestException('La recepción ya está anulada');
    }
  }

  private async findFiscalDocuments(
    companyId: string,
    receptionId: string,
  ): Promise<Transaction[]> {
    return this.txRepo
      .createQueryBuilder('tx')
      .where('tx.companyId = :companyId', { companyId })
      .andWhere('tx.transactionType IN (:...types)', {
        types: [
          TransactionType.SUPPLIER_INVOICE,
          TransactionType.SUPPLIER_RECEIPT,
        ],
      })
      .andWhere(`(tx.metadata::jsonb #>> '{links,receptionId}') = :receptionId`, {
        receptionId,
      })
      .andWhere('tx.status NOT IN (:...closed)', { closed: CLOSED_TX_STATUSES })
      .getMany();
  }

  /** Bloquea si hay pagos confirmados; devuelve las cuotas programadas (DRAFT) a anular. */
  private async assertNoConfirmedPayments(
    companyId: string,
    parentIds: string[],
  ): Promise<Transaction[]> {
    if (parentIds.length === 0) return [];
    const payments = await this.txRepo.find({
      where: {
        companyId,
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        relatedTransactionId: In(parentIds),
      },
    });
    const active = payments.filter((p) => !CLOSED_TX_STATUSES.includes(p.status));
    const executed = active.filter((p) => p.status !== TransactionStatus.DRAFT);
    if (executed.length > 0) {
      throw new BadRequestException(
        `La recepción tiene ${executed.length} pago(s) a proveedor aplicados y no puede anularse. Anule primero los pagos.`,
      );
    }
    return active;
  }

  private async assertNoReturns(
    companyId: string,
    receptionId: string,
    parentIds: string[],
  ): Promise<void> {
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.companyId = :companyId', { companyId })
      .andWhere('tx.transactionType IN (:...types)', {
        types: [
          TransactionType.PURCHASE_RETURN,
          TransactionType.SUPPLIER_CREDIT_NOTE,
        ],
      })
      .andWhere('tx.status NOT IN (:...closed)', { closed: CLOSED_TX_STATUSES });
    if (parentIds.length > 0) {
      qb.andWhere(
        `(tx.relatedTransactionId IN (:...parentIds) OR (tx.metadata::jsonb #>> '{links,receptionId}') = :receptionId)`,
        { parentIds, receptionId },
      );
    } else {
      qb.andWhere(`(tx.metadata::jsonb #>> '{links,receptionId}') = :receptionId`, {
        receptionId,
      });
    }
    const count = await qb.getCount();
    if (count > 0) {
      throw new BadRequestException(
        'La recepción tiene devoluciones o notas de crédito de proveedor asociadas y no puede anularse. Gestione primero esos documentos.',
      );
    }
  }

  private async assertPeriodOpen(purchase: Transaction | null): Promise<void> {
    if (!purchase?.accountingPeriodId) return;
    const period = await this.dataSource
      .getRepository(AccountingPeriod)
      .findOne({ where: { id: purchase.accountingPeriodId } });
    if (period && period.status === AccountingPeriodStatus.CLOSED) {
      throw new BadRequestException(
        'El período contable de la recepción está cerrado y no puede anularse.',
      );
    }
  }

  /** Cantidad (en unidad base) por variante, igual que la sumó `update-stock`. */
  private collectStockLines(purchase: Transaction | null): Map<string, number> {
    const byVariant = new Map<string, number>();
    for (const l of (purchase?.lines ?? []) as TransactionLine[]) {
      if (!l.productVariantId) continue;
      const qty = Number(l.quantity) || 0;
      const base =
        l.quantityInBase != null && (l.quantityInBase as unknown) !== ''
          ? Number(l.quantityInBase)
          : qty;
      const q = Number.isFinite(base) ? base : qty;
      if (q <= 0) continue;
      byVariant.set(l.productVariantId, (byVariant.get(l.productVariantId) ?? 0) + q);
    }
    return byVariant;
  }

  private async assertStockAvailable(
    purchase: Transaction | null,
    stockLines: Map<string, number>,
  ): Promise<void> {
    if (!purchase?.storageId || stockLines.size === 0) return;
    const levels = await this.dataSource.getRepository(StockLevel).find({
      where: {
        storageId: purchase.storageId,
        productVariantId: In([...stockLines.keys()]),
      },
    });
    const byVariant = new Map(levels.map((s) => [s.productVariantId, s]));
    const short: string[] = [];
    for (const [variantId, qty] of stockLines) {
      const have = Number(byVariant.get(variantId)?.physicalStock ?? 0);
      if (have + 1e-6 < qty) {
        const name =
          (purchase.lines ?? []).find((l) => l.productVariantId === variantId)
            ?.productName ?? variantId;
        short.push(`${name}: recibido ${qty}, en bodega ${have}`);
      }
    }
    if (short.length > 0) {
      throw new BadRequestException(
        `No se puede anular: parte de la mercadería ya fue consumida o vendida (${short.join('; ')}).`,
      );
    }
  }

  private async planPmpRestore(
    purchase: Transaction | null,
    stockLines: Map<string, number>,
    acknowledge: boolean,
    warnings: string[],
  ): Promise<PmpRestorePlan[]> {
    if (!purchase || stockLines.size === 0) return [];
    const variants = await this.dataSource.getRepository(ProductVariant).find({
      where: { id: In([...stockLines.keys()]) },
    });
    const plans: PmpRestorePlan[] = [];
    const blocked: string[] = [];
    for (const v of variants) {
      const history = ((v as any).pmpHistory ?? []) as Array<{
        transactionId?: string;
        previousPmp: number;
        newPmp: number;
        unitCost?: number;
        quantity?: number;
      }>;
      const idx = history.findIndex((h) => h.transactionId === purchase.id);
      if (idx < 0) {
        warnings.push(
          `PMP de "${(v as any).name ?? v.id}" sin cambios: la compra no registró cambio de PMP.`,
        );
        continue;
      }
      const entry = history[idx];
      const currentPmp = Number((v as any).pmp) || 0;
      const isLast = idx === history.length - 1;
      const matchesCurrent = Math.abs(currentPmp - Number(entry.newPmp)) < 0.01;
      if (!isLast || !matchesCurrent) {
        if (!acknowledge) {
          blocked.push((v as any).name ?? v.id);
        } else {
          warnings.push(
            `PMP de "${(v as any).name ?? v.id}" no restaurado: hubo movimientos posteriores.`,
          );
        }
        continue;
      }
      plans.push({
        variantId: v.id,
        restoreTo: Number(entry.previousPmp) > 0 ? Number(entry.previousPmp) : null,
        previousPmp: Number(entry.previousPmp),
        currentPmp,
        unitCost: entry.unitCost,
        quantity: entry.quantity,
      });
    }
    if (blocked.length > 0) {
      throw new BadRequestException(
        `No se puede restaurar el PMP de forma exacta porque hubo compras u otros movimientos posteriores (${blocked.join(', ')}). Confirme con acknowledgePmpNotRestored para anular dejando el PMP sin cambios.`,
      );
    }
    return plans;
  }

  private async createStockOutAdjustment(
    purchase: Transaction,
    userId: string,
    reason: string,
  ): Promise<Transaction> {
    const lines = (purchase.lines ?? []).filter(
      (l) => l.productVariantId && (Number(l.quantity) || 0) > 0,
    );
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
    const dto = new CreateTransactionDto();
    Object.assign(dto, {
      transactionType: TransactionType.ADJUSTMENT_OUT,
      companyId: purchase.companyId,
      branchId: purchase.branchId,
      userId,
      storageId: purchase.storageId,
      relatedTransactionId: purchase.id,
      subtotal: total,
      taxAmount: 0,
      discountAmount: 0,
      total,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      amountPaid: 0,
      notes: `Salida por anulación de recepción ${purchase.documentNumber ?? purchase.id}: ${reason}`,
      metadata: {
        origin: RECEPTION_VOID_ORIGIN,
        voidOfTransactionId: purchase.id,
        reason,
      },
      lines: mappedLines,
    });
    return this.transactionsService.createTransaction(dto);
  }

  /** Si la transacción BD falla tras bajar el stock, se repone para no dejar inventario descuadrado. */
  private async compensateStock(
    purchase: Transaction | null,
    stockAdjustmentId: string | null,
    userId: string,
    cause: unknown,
  ): Promise<void> {
    if (!purchase || !stockAdjustmentId) return;
    try {
      const dto = new CreateTransactionDto();
      const lines = (purchase.lines ?? [])
        .filter((l) => l.productVariantId && (Number(l.quantity) || 0) > 0)
        .map((l) => ({
          productId: l.productId ?? undefined,
          productVariantId: l.productVariantId!,
          productName: l.productName || 'Producto',
          quantity: Number(l.quantity) || 0,
          quantityInBase:
            l.quantityInBase != null ? Number(l.quantityInBase) : undefined,
          unitPrice: Number(l.unitPrice) || 0,
          unitCost: l.unitCost != null ? Number(l.unitCost) : undefined,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          discountPercentage: 0,
          subtotal: 0,
          total: 0,
        }));
      Object.assign(dto, {
        transactionType: TransactionType.ADJUSTMENT_IN,
        companyId: purchase.companyId,
        branchId: purchase.branchId,
        userId,
        storageId: purchase.storageId,
        relatedTransactionId: stockAdjustmentId,
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        amountPaid: 0,
        notes: 'Reposición por fallo al anular recepción',
        metadata: { origin: RECEPTION_VOID_ORIGIN, compensationOf: stockAdjustmentId },
        lines,
      });
      await this.transactionsService.createTransaction(dto);
    } catch (e) {
      this.logger.error(
        `No se pudo compensar el stock tras fallo de anulación (ajuste ${stockAdjustmentId}): ${
          e instanceof Error ? e.message : String(e)
        }. Causa original: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }

  private async markVoided(
    repo: Repository<Transaction>,
    txId: string,
    voidMeta: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    const tx = await repo.findOne({ where: { id: txId } });
    if (!tx) return;
    tx.status = TransactionStatus.VOIDED;
    tx.paymentStatus = PaymentStatus.VOIDED;
    tx.metadata = { ...(tx.metadata ?? {}), void: voidMeta } as any;
    const notes = String(tx.notes ?? '').trim();
    tx.notes = notes ? `${notes}\nVOIDED: ${reason}` : `VOIDED: ${reason}`;
    await repo.save(tx);
  }

  private async cancelOpenInstallments(
    manager: import('typeorm').EntityManager,
    purchaseId: string,
    voidMeta: Record<string, unknown>,
  ): Promise<void> {
    const repo = manager.getRepository(Installment);
    const open = await repo.find({
      where: {
        sourceTransactionId: purchaseId,
        status: In(OPEN_INSTALLMENT_STATUSES),
      },
    });
    for (const inst of open) {
      inst.metadata = {
        ...(inst.metadata ?? {}),
        cancelledByReceptionVoid: voidMeta,
      } as any;
      // No existe estado CANCELLED en installments (ver brecha G6 del diseño).
      inst.amountPaid = Number(inst.amount) || 0;
      inst.status = InstallmentStatus.PAID;
      await repo.save(inst);
    }
  }
}
