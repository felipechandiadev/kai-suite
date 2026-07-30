import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

/**
 * Read Model: TransactionSummary
 *
 * Optimized for listing and searching transactions.
 * Contains only the fields needed for transaction lists and search results.
 */
export class TransactionSummaryReadModel {
  constructor(
    public readonly id: string,
    public readonly transactionNumber: string,
    public readonly transactionType: TransactionType,
    public readonly status: TransactionStatus,
    public readonly totalAmount: number,
    public readonly paymentMethod: PaymentMethod,
    public readonly branchId: string,
    public readonly branchName: string,
    public readonly userId: string,
    public readonly userName: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt: Date,
    public readonly itemCount: number,
    public readonly customerId?: string,
    public readonly customerName?: string,
  ) {}

  /**
   * Check if transaction is completed
   */
  isCompleted(): boolean {
    return this.status === TransactionStatus.RECEIVED;
  }

  /**
   * Check if transaction is pending
   */
  isPending(): boolean {
    return this.status === TransactionStatus.CONFIRMED;
  }

  /**
   * Check if transaction is voided
   */
  isVoided(): boolean {
    return this.status === TransactionStatus.CANCELLED;
  }

  /**
   * Get formatted amount with currency
   */
  getFormattedAmount(currency: string = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
    }).format(this.totalAmount);
  }

  /**
   * Get transaction age in days
   */
  getAgeInDays(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}

/**
 * Read Model: TransactionDetailReadModel
 *
 * Optimized for detailed transaction views.
 * Contains transaction with related entities denormalized.
 */
export class TransactionDetailReadModel {
  constructor(
    public readonly id: string,
    public readonly transactionNumber: string,
    public readonly transactionType: TransactionType,
    public readonly status: TransactionStatus,
    public readonly totalAmount: number,
    public readonly paymentMethod: PaymentMethod,
    public readonly customer: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    } | null,
    public readonly branch: {
      id: string;
      name: string;
      address?: string;
    },
    public readonly user: {
      id: string;
      name: string;
      email: string;
    },
    public readonly lines: TransactionLineSummary[],
    public readonly payments: TransactionPaymentSummary[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt: Date,
    public readonly notes?: string,
  ) {}

  /**
   * Get total paid amount
   */
  getTotalPaid(): number {
    return this.payments.reduce((total, payment) => total + payment.amount, 0);
  }

  /**
   * Get remaining balance
   */
  getRemainingBalance(): number {
    return this.totalAmount - this.getTotalPaid();
  }

  /**
   * Check if transaction is fully paid
   */
  isFullyPaid(): boolean {
    return this.getRemainingBalance() <= 0;
  }
}

/**
 * Transaction Line Summary for read models
 */
export class TransactionLineSummary {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly discount: number = 0,
    public readonly total: number,
  ) {}

  /**
   * Get discounted unit price
   */
  getDiscountedUnitPrice(): number {
    return this.unitPrice - this.discount;
  }
}

/**
 * Transaction Payment Summary for read models
 */
export class TransactionPaymentSummary {
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly method: PaymentMethod,
    public readonly paidAt: Date,
    public readonly reference?: string,
  ) {}
}
