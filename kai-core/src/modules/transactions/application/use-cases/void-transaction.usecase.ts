import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';
import { CacheService } from '../../../../shared/cache/cache.service';

/**
 * Comando para anular una transacción
 */
export class VoidTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly reason: string,
    public readonly approvedBy: string,
    public readonly notes?: string,
  ) {}
}

/**
 * Use Case: Anular Transacción
 *
 * Crea una transacción VOID_ADJUSTMENT que anula la transacción original.
 * Mantiene trazabilidad completa con metadata de la anulación.
 */
@Injectable()
export class VoidTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly cacheService: CacheService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  async execute(command: VoidTransactionCommand): Promise<Transaction> {
    // Validar transacción original
    const originalTransaction = await this.transactionRepository.findById(
      command.transactionId,
    );
    if (!originalTransaction) {
      throw new BadRequestException(
        `Transacción ${command.transactionId} no encontrada`,
      );
    }

    // Validar que se pueda anular
    if (originalTransaction.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException('La transacción ya está anulada');
    }

    // Validar tipos que se pueden anular
    const nonVoidableTypes = [
      TransactionType.VOID_ADJUSTMENT,
      TransactionType.PAYMENT_EXECUTION,
      TransactionType.CASH_SESSION_OPENING,
      TransactionType.CASH_SESSION_CLOSING,
    ];

    if (nonVoidableTypes.includes(originalTransaction.transactionType)) {
      throw new BadRequestException(
        `Tipo de transacción ${originalTransaction.transactionType} no se puede anular`,
      );
    }

    // Crear transacción de anulación
    const voidTransaction = new Transaction();
    voidTransaction.transactionType = TransactionType.VOID_ADJUSTMENT;
    voidTransaction.status = TransactionStatus.CONFIRMED;
    voidTransaction.branchId = originalTransaction.branchId;
    voidTransaction.userId = originalTransaction.userId;
    voidTransaction.relatedTransactionId = command.transactionId; // Referencia a la original

    // Montos: negativo del original para contrarrestar
    voidTransaction.subtotal = -originalTransaction.subtotal;
    voidTransaction.taxAmount = -originalTransaction.taxAmount;
    voidTransaction.discountAmount = -originalTransaction.discountAmount;
    voidTransaction.total = -originalTransaction.total;

    // Metadata de anulación
    voidTransaction.metadata = {
      voidReason: command.reason,
      voidApprovedBy: command.approvedBy,
      voidTimestamp: new Date().toISOString(),
      originalTransactionType: originalTransaction.transactionType,
      originalTransactionDate: originalTransaction.createdAt.toISOString(),
      ...originalTransaction.metadata,
    };

    if (command.notes) {
      voidTransaction.notes = command.notes;
    }

    // Copiar otras referencias relevantes
    voidTransaction.customerId = originalTransaction.customerId;
    voidTransaction.supplierId = originalTransaction.supplierId;
    voidTransaction.pointOfSaleId = originalTransaction.pointOfSaleId;
    voidTransaction.cashSessionId = originalTransaction.cashSessionId;
    voidTransaction.cashHubId = originalTransaction.cashHubId ?? null;

    // Generar número de documento
    voidTransaction.documentNumber = await this.generateVoidDocumentNumber(
      originalTransaction.documentNumber,
      originalTransaction.branchId!,
    );

    // Marcar transacción original como anulada (sin cambiar status para mantener historial)
    // En su lugar, agregamos metadata de anulación
    originalTransaction.metadata = {
      ...originalTransaction.metadata,
      voidedBy: voidTransaction.id,
      voidedAt: new Date().toISOString(),
      voidReason: command.reason,
    };

    // Guardar ambas transacciones
    await this.transactionRepository.save(voidTransaction);
    await this.transactionRepository.save(originalTransaction);

    // Revertir redenciones de promociones (PR 5):
    //   - Decrementar `uses_count` de cada promoción consumida.
    //   - Insertar redención negativa para auditoría (mantiene historial
    //     inmutable y permite reportes "ventas anuladas").
    await this.revertPromotionRedemptions(
      originalTransaction.id,
      voidTransaction.id,
      command.reason,
    );

    // Invalidar caché relacionado con la transacción
    await this.invalidateRelatedCache(originalTransaction);

    return voidTransaction;
  }

  /**
   * Compensación de promociones aplicadas en la venta anulada:
   *   - Para cada `promotion_redemption` positivo de la transacción
   *     original: insertar un registro espejo con `amount_discounted`
   *     negativo y referencia a la transacción VOID.
   *   - `UPDATE promotions SET uses_count = GREATEST(uses_count - 1, 0)`
   *     por cada redención, sin tocar `max_uses_total`.
   *
   * Se ejecuta best-effort: si la BD no expone aún las tablas, el void
   * no falla.
   */
  private async revertPromotionRedemptions(
    originalTransactionId: string,
    voidTransactionId: string,
    reason: string,
  ): Promise<void> {
    if (!this.dataSource) return;
    try {
      const redemptions = await this.dataSource.query<
        {
          id: string;
          company_id: string;
          promotion_id: string;
          customer_id: string | null;
          amount_discounted: string;
          snapshot: Record<string, any>;
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
      // Tablas de promociones aún no creadas (entornos legacy) → ignorar.
    }
  }

  private async generateVoidDocumentNumber(
    originalDocumentNumber: string,
    branchId: string,
  ): Promise<string> {
    // Generar número único para la anulación
    const timestamp = Date.now();
    return `VOID${originalDocumentNumber}${timestamp}`;
  }

  /**
   * Invalida el caché relacionado con la transacción anulada
   */
  private async invalidateRelatedCache(
    transaction: Transaction,
  ): Promise<void> {
    // Invalidar caché de transacción específica
    await this.cacheService.invalidateTransactionDetails(transaction.id);

    // Invalidar caché de cliente si aplica
    if (transaction.customerId) {
      await this.cacheService.invalidateCustomerCache(transaction.customerId);
    }

    // Invalidar resúmenes diarios/mensuales que puedan incluir esta transacción
    const transactionDate = transaction.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    await this.cacheService.invalidateTransactionSummary(transactionDate);

    // Invalidar ventas diarias si es una venta
    if (transaction.transactionType === TransactionType.SALE) {
      await this.cacheService.invalidateDailySales(transactionDate);
    }
  }
}
