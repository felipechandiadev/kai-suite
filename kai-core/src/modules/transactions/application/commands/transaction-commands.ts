import { BaseCommand } from '@shared/cqrs/base.command';

export class VoidTransactionCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly voidReason: string,
    public readonly voidedBy: string,
  ) {
    super();
  }
}

export class CompleteTransactionCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly completedBy: string,
  ) {
    super();
  }
}

export class AdjustTransactionAmountCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly newAmount: number,
    public readonly adjustmentReason: string,
    public readonly adjustedBy: string,
  ) {
    super();
  }
}

export class AddTransactionLineCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly discount: number = 0,
    public readonly addedBy: string,
  ) {
    super();
  }
}

export class RemoveTransactionLineCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly lineId: string,
    public readonly removedBy: string,
  ) {
    super();
  }
}

export class ProcessTransactionPaymentCommand extends BaseCommand {
  constructor(
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly paymentMethod: string,
    public readonly processedBy: string,
    public readonly reference?: string,
  ) {
    super();
  }
}
