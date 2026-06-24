import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  PaymentMethod,
  Transaction,
  TransactionType,
} from '../domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import type { TransactionBackorderMetadata } from '../domain/transaction-backorder.metadata';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CancelBackorderDto } from './dto/cancel-backorder.dto';
import { EshopBackorderSyncService } from './eshop-backorder-sync.service';

export type CancelBackorderResult = {
  backorder: {
    id: string;
    documentNumber: string;
    reservationStatus: string;
  };
  creditNote: {
    id: string;
    documentNumber: string;
    total: number;
  } | null;
  refundedAmount: number;
};

@Injectable()
export class CancelBackorderService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly stockCommitment: StockCommitmentService,
    private readonly transactionsService: TransactionsService,
    private readonly eshopBackorderSync: EshopBackorderSyncService,
  ) {}

  async cancel(
    companyId: string,
    userId: string,
    backorderId: string,
    dto: CancelBackorderDto,
  ): Promise<CancelBackorderResult> {
    const cid = companyId?.trim();
    const id = backorderId?.trim();
    const uid = userId?.trim();
    if (!cid || !id) {
      throw new BadRequestException('Identificador de encargo inválido');
    }
    if (!uid) {
      throw new BadRequestException('Usuario requerido para anular el encargo');
    }

    const backorder = await this.txRepo.findOne({
      where: {
        id,
        companyId: cid,
        transactionType: TransactionType.BACKORDER,
      },
      relations: ['lines'],
    });
    if (!backorder) {
      throw new NotFoundException('Encargo no encontrado');
    }

    const meta = { ...(backorder.metadata ?? {}) } as Record<string, unknown>;
    const bo = {
      ...((meta.backorder ?? {}) as TransactionBackorderMetadata),
    };
    const status = String(bo.reservationStatus ?? 'OPEN').toUpperCase();
    if (status === 'FULFILLED') {
      throw new BadRequestException(
        'El encargo ya fue liquidado y no puede anularse',
      );
    }
    if (status === 'CANCELLED') {
      return this.buildAlreadyCancelledResult(backorder, bo);
    }
    if (status !== 'OPEN') {
      throw new BadRequestException(
        `El encargo no puede anularse en estado ${status}`,
      );
    }

    const customerId = backorder.customerId?.trim();
    if (!customerId) {
      throw new BadRequestException('El encargo no tiene cliente asociado');
    }

    const deposit = Math.round(Number(bo.depositAmount ?? backorder.amountPaid) || 0);
    const consumed = Math.round(Number(bo.depositConsumedAmount ?? 0) || 0);
    const refundAmount = Math.max(0, deposit - consumed);

    let creditNoteTx: Transaction | null = null;
    if (refundAmount >= 1) {
      const ncDto = new CreateTransactionDto();
      const docNum = backorder.documentNumber?.trim() || '';
      Object.assign(ncDto, {
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
        companyId: cid,
        branchId: backorder.branchId,
        userId: uid,
        customerId,
        pointOfSaleId: backorder.pointOfSaleId ?? undefined,
        relatedTransactionId: backorder.id,
        subtotal: refundAmount,
        taxAmount: 0,
        discountAmount: 0,
        total: refundAmount,
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 0,
        notes: docNum
          ? `NC por anulación de encargo · ${docNum}`
          : 'NC por anulación de encargo',
        metadata: {
          origin: 'BACKORDER_CANCEL',
          links: {
            backorderId: backorder.id,
            ...(docNum ? { backorderDocumentNumber: docNum } : {}),
          },
        },
        lines: [],
      });
      creditNoteTx = await this.transactionsService.createTransaction(ncDto);
    }

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.getRepository(Transaction).findOne({
        where: { id, companyId: cid },
      });
      if (!locked) {
        throw new NotFoundException('Encargo no encontrado');
      }
      const lockedMeta = { ...(locked.metadata ?? {}) } as Record<string, unknown>;
      const lockedBo = {
        ...((lockedMeta.backorder ?? {}) as TransactionBackorderMetadata),
      };
      const lockedStatus = String(
        lockedBo.reservationStatus ?? 'OPEN',
      ).toUpperCase();
      if (lockedStatus === 'CANCELLED') {
        return;
      }
      if (lockedStatus !== 'OPEN') {
        throw new BadRequestException(
          'El encargo cambió de estado y no puede anularse',
        );
      }

      await this.releaseBackorderReservation(manager, {
        companyId: cid,
        backorderId: id,
        lines: backorder.lines ?? [],
      });

      lockedBo.reservationStatus = 'CANCELLED';
      lockedBo.cancelledAt = new Date().toISOString();
      lockedBo.cancelReason = dto.reason?.trim() || null;
      if (creditNoteTx) {
        lockedBo.creditNoteTransactionId = creditNoteTx.id;
      }
      lockedMeta.backorder = lockedBo;
      locked.metadata = lockedMeta;
      await manager.getRepository(Transaction).save(locked);
    });

    await this.eshopBackorderSync.syncOnBackorderCancelled(
      id,
      dto.reason?.trim() || null,
    );

    const refreshed = await this.txRepo.findOne({ where: { id } });
    const refreshedBo = (refreshed?.metadata?.backorder ??
      {}) as TransactionBackorderMetadata;

    return {
      backorder: {
        id: backorder.id,
        documentNumber: String(backorder.documentNumber ?? backorder.id),
        reservationStatus: refreshedBo.reservationStatus ?? 'CANCELLED',
      },
      creditNote: creditNoteTx
        ? {
            id: creditNoteTx.id,
            documentNumber: String(
              creditNoteTx.documentNumber ?? creditNoteTx.id,
            ),
            total: Math.round(Number(creditNoteTx.total) || refundAmount),
          }
        : null,
      refundedAmount: refundAmount,
    };
  }

  private buildAlreadyCancelledResult(
    backorder: Transaction,
    bo: TransactionBackorderMetadata,
  ): CancelBackorderResult {
    return {
      backorder: {
        id: backorder.id,
        documentNumber: String(backorder.documentNumber ?? backorder.id),
        reservationStatus: 'CANCELLED',
      },
      creditNote: null,
      refundedAmount: 0,
    };
  }

  private async releaseBackorderReservation(
    manager: EntityManager,
    params: {
      companyId: string;
      backorderId: string;
      lines: TransactionLine[];
    },
  ): Promise<void> {
    const reservation = await manager.getRepository(Transaction).findOne({
      where: {
        companyId: params.companyId,
        transactionType: TransactionType.INVENTORY_RESERVATION,
        relatedTransactionId: params.backorderId,
      },
      relations: ['lines'],
      order: { createdAt: 'DESC' },
    });

    const storageId = reservation?.storageId?.trim();
    if (!storageId) {
      throw new BadRequestException(
        'No se encontró la reserva de inventario del encargo',
      );
    }

    const releaseLines = reservation?.lines?.length
      ? reservation.lines
      : params.lines;

    for (const rl of releaseLines) {
      const vid = rl.productVariantId?.trim();
      if (!vid) continue;
      const qty =
        Number(rl.quantityInBase) > 0
          ? Number(rl.quantityInBase)
          : Number(rl.quantity) || 0;
      if (qty <= 0) continue;
      await this.stockCommitment.release(manager, {
        companyId: params.companyId,
        variantId: vid,
        storageId,
        qty,
        lastTransactionId: params.backorderId,
      });
    }
  }
}
