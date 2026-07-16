import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import type { TransactionBackorderMetadata } from '../domain/transaction-backorder.metadata';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';

export type BackorderSource = 'pos' | 'e-shop';

export type BuildBackorderMetadataInput = {
  depositAmount?: number;
  depositPercent?: number;
  customerSnapshot?: TransactionBackorderMetadata['customerSnapshot'];
  expectedAvailabilityNote?: string | null;
};

@Injectable()
export class BackorderRegistrationService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly stockCommitment: StockCommitmentService,
  ) {}

  buildInitialBackorderMetadata(
    input: BuildBackorderMetadataInput = {},
  ): TransactionBackorderMetadata {
    const depositAmount = Math.max(0, Math.round(Number(input.depositAmount) || 0));
    return {
      reservationStatus: 'OPEN',
      depositAmount,
      depositConsumedAmount: 0,
      ...(input.depositPercent != null && Number.isFinite(input.depositPercent)
        ? { depositPercent: Math.round(input.depositPercent) }
        : {}),
      ...(input.customerSnapshot ? { customerSnapshot: input.customerSnapshot } : {}),
      ...(input.expectedAvailabilityNote
        ? { expectedAvailabilityNote: input.expectedAvailabilityNote }
        : {}),
    };
  }

  /**
   * Crea `INVENTORY_RESERVATION` y compromete stock para un encargo ya persistido.
   */
  async createStockReservationForBackorder(params: {
    companyId: string;
    branchId: string;
    storageId: string | undefined;
    customerId: string;
    userId: string;
    backorderTransaction: Pick<Transaction, 'id' | 'documentNumber'>;
    lines: Array<Pick<
      TransactionLine,
      | 'productId'
      | 'productVariantId'
      | 'productName'
      | 'variantName'
      | 'quantity'
      | 'quantityInBase'
      | 'unitOfMeasure'
    >>;
    manager?: EntityManager;
  }): Promise<void> {
    const run = async (manager: EntityManager) => {
      await this.createStockReservationWithManager(manager, params);
    };
    if (params.manager) {
      await run(params.manager);
      return;
    }
    await this.dataSource.transaction(run);
  }

  private async createStockReservationWithManager(
    manager: EntityManager,
    params: {
      companyId: string;
      branchId: string;
      storageId: string | undefined;
      customerId: string;
      userId: string;
      backorderTransaction: Pick<Transaction, 'id' | 'documentNumber'>;
      lines: Array<Pick<
        TransactionLine,
        | 'productId'
        | 'productVariantId'
        | 'productName'
        | 'variantName'
        | 'quantity'
        | 'quantityInBase'
        | 'unitOfMeasure'
      >>;
    },
  ): Promise<void> {
    const { storageId, customerId, lines } = params;
    if (!storageId?.trim()) {
      throw new BadRequestException(
        'No hay almacén para reservar stock del encargo. Configure un almacén predeterminado en la sucursal o envíe storageId.',
      );
    }
    if (!customerId?.trim()) {
      throw new BadRequestException(
        'El encargo requiere cliente para reservar inventario',
      );
    }

    const inventariable = lines.filter((l) => l.productVariantId);
    if (inventariable.length === 0) {
      throw new BadRequestException(
        'El encargo no tiene líneas con variante para reservar stock',
      );
    }

    const documentNumber = `IR${Date.now()}`;
    const reservationTx = await manager.getRepository(Transaction).save(
      manager.getRepository(Transaction).create({
        companyId: params.companyId,
        documentNumber,
        transactionType: TransactionType.INVENTORY_RESERVATION,
        status: TransactionStatus.COMPLETED,
        branchId: params.branchId,
        storageId,
        customerId,
        userId: params.userId,
        total: 0,
        relatedTransactionId: params.backorderTransaction.id,
        externalReference: params.backorderTransaction.documentNumber ?? null,
        notes: `Reserva por encargo ${params.backorderTransaction.documentNumber ?? ''}`,
      }),
    );

    for (let i = 0; i < inventariable.length; i++) {
      const tl = inventariable[i];
      const saleQty = Number(tl.quantity) || 0;
      const baseQty =
        Number(tl.quantityInBase) > 0 ? Number(tl.quantityInBase) : saleQty;
      if (baseQty <= 0) continue;

      await manager.getRepository(TransactionLine).save(
        manager.getRepository(TransactionLine).create({
          companyId: params.companyId,
          transactionId: reservationTx.id,
          productId: tl.productId,
          productVariantId: tl.productVariantId,
          productName: tl.productName,
          variantName: tl.variantName,
          quantity: saleQty > 0 ? saleQty : baseQty,
          quantityInBase: baseQty,
          unitOfMeasure:
            typeof tl.unitOfMeasure === 'string' && tl.unitOfMeasure.trim()
              ? tl.unitOfMeasure.trim().slice(0, 20)
              : 'u',
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          lineNumber: i + 1,
          notes: `Encargo ${params.backorderTransaction.documentNumber ?? ''}`,
        }),
      );

      await this.stockCommitment.reserve(manager, {
        companyId: params.companyId,
        variantId: tl.productVariantId as string,
        storageId,
        qty: baseQty,
        lastTransactionId: reservationTx.id,
      });
    }
  }
}
