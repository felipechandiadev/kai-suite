import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../../domain/transaction.entity';
import { isImmediateSaleReturnRefund } from '@modules/cash-sessions/application/sale-return-transaction-cash-flow.util';

export interface SessionMovement {
  id: string;
  transactionType: TransactionType;
  documentNumber: string;
  /** Tipo de documento tributario (`transactions.documentType`). */
  documentType?: string | null;
  /** Folio del documento tributario (`transactions.documentFolio`). */
  documentFolio?: string | null;
  createdAt?: Date;
  total: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  userId?: string | null;
  userFullName?: string | null;
  userUserName?: string | null;
  notes?: string | null;
  reason?: string | null;
  metadata?: any;
  direction: 'IN' | 'OUT' | 'NEUTRAL';
  /** Transacción origen cuando la fila es vuelto derivado de una SALE. */
  relatedTransactionId?: string | null;
}

export class GetMovementsForSessionQuery {
  constructor(public readonly cashSessionId: string) {}
}

@Injectable()
@QueryHandler(GetMovementsForSessionQuery)
export class GetMovementsForSessionQueryHandler implements IQueryHandler<GetMovementsForSessionQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(
    query: GetMovementsForSessionQuery,
  ): Promise<SessionMovement[]> {
    const txs = await this.transactionRepository.find({
      where: { cashSessionId: query.cashSessionId },
      relations: ['user', 'user.person'],
      order: { createdAt: 'DESC' },
    });

    const movements: SessionMovement[] = [];

    for (const tx of txs) {
      // Cobros PAYMENT_IN duplican la venta SALE en POS; no listar en movimientos de caja.
      if (tx.transactionType === TransactionType.PAYMENT_IN) {
        continue;
      }
      movements.push(this.mapTransaction(tx));
    }

    movements.sort((a, b) => {
      const ta = a.createdAt?.getTime() ?? 0;
      const tb = b.createdAt?.getTime() ?? 0;
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });

    return movements;
  }

  private mapTransaction(tx: Transaction): SessionMovement {
    const userFullName = tx.user?.person
      ? `${tx.user.person.firstName} ${tx.user.person.lastName}`
      : null;
    const userUserName = tx.user?.userName || null;

    return {
      id: tx.id,
      transactionType: tx.transactionType,
      documentNumber: tx.documentNumber,
      documentType: tx.documentType ?? null,
      documentFolio: tx.documentFolio ?? null,
      createdAt: tx.createdAt,
      total: Number(tx.total || 0),
      paymentMethod: tx.paymentMethod,
      paymentMethodLabel: undefined,
      userId: tx.userId || null,
      userFullName,
      userUserName,
      notes: tx.notes || null,
      reason: tx.metadata?.reason || null,
      metadata: tx.metadata || null,
      direction: this.computeDirection(tx),
      relatedTransactionId: tx.relatedTransactionId ?? null,
    };
  }

  private computeDirection(tx: Transaction): 'IN' | 'OUT' | 'NEUTRAL' {
    switch (tx.transactionType) {
      case TransactionType.CASH_SESSION_OPENING:
        return 'NEUTRAL';
      case TransactionType.CASH_SESSION_CLOSING:
        return 'OUT';
      case TransactionType.SALE:
      case TransactionType.CASH_SESSION_DEPOSIT:
      case TransactionType.PAYMENT_IN:
        return 'IN';
      case TransactionType.SALE_RETURN:
        return isImmediateSaleReturnRefund(tx) ? 'OUT' : 'NEUTRAL';
      case TransactionType.CASH_SESSION_WITHDRAWAL:
      case TransactionType.CASH_SESSION_TO_HUB_TRANSFER:
      case TransactionType.OPERATING_EXPENSE:
      case TransactionType.SUPPLIER_PAYMENT:
      case TransactionType.PAYROLL_PAYMENT:
      case TransactionType.EXPENSE_PAYMENT:
      case TransactionType.BANK_TO_CASH_TRANSFER:
      case TransactionType.CASH_DEPOSIT:
      case TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT:
        return 'OUT';
      default:
        return 'NEUTRAL';
    }
  }
}
