import { BaseDomainEvent } from '@shared/cqrs/base.domain-event';
import {
  Transaction,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';

/**
 * Domain Event: TransactionVoided
 *
 * Emitted when a transaction is voided/cancelled.
 * Contains the original transaction and void reason.
 */
export class TransactionVoidedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly originalTransaction: Transaction,
    public readonly voidReason: string,
    public readonly voidedBy: string,
    public readonly voidedAt: Date = new Date(),
  ) {
    super();
  }
}

/**
 * Domain Event: TransactionStatusChanged
 *
 * Emitted when a transaction status changes (e.g., PENDING -> COMPLETED).
 */
export class TransactionStatusChangedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly previousStatus: TransactionStatus,
    public readonly newStatus: TransactionStatus,
    public readonly changedBy: string,
    public readonly changedAt: Date = new Date(),
  ) {
    super();
  }
}

/**
 * Domain Event: TransactionAmountAdjusted
 *
 * Emitted when a transaction amount is adjusted (price changes, discounts, etc.).
 */
export class TransactionAmountAdjustedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly previousAmount: number,
    public readonly newAmount: number,
    public readonly adjustmentReason: string,
    public readonly adjustedBy: string,
    public readonly adjustedAt: Date = new Date(),
  ) {
    super();
  }
}

/**
 * Domain Event: TransactionPaymentCompleted
 *
 * Emitted when a transaction payment is completed.
 */
export class TransactionPaymentCompletedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly paymentMethod: string,
    public readonly amount: number,
    public readonly completedBy: string,
    public readonly completedAt: Date = new Date(),
  ) {
    super();
  }
}

/**
 * Domain Event: TransactionLineAdded
 *
 * Emitted when a transaction line is added to a transaction.
 */
export class TransactionLineAddedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly lineId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly addedBy: string,
    public readonly addedAt: Date = new Date(),
  ) {
    super();
  }
}

/**
 * Domain Event: TransactionLineRemoved
 *
 * Emitted when a transaction line is removed from a transaction.
 */
export class TransactionLineRemovedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly lineId: string,
    public readonly productId: string,
    public readonly removedBy: string,
    public readonly removedAt: Date = new Date(),
  ) {
    super();
  }
}
