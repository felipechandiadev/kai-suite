import { BaseDomainEvent } from '@shared/cqrs';

export class InventoryCountCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly branchId: string,
    public readonly storageId: string,
    public readonly totalLines: number,
    public readonly linesWithDifferences: number,
  ) {
    super();
  }
}

export class InventoryReservationCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly productId: string,
    public readonly variantId: string | undefined,
    public readonly quantity: number,
    public readonly customerId: string,
    public readonly expiresAt: Date | undefined,
  ) {
    super();
  }
}

export class InventoryBlockCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly productId: string,
    public readonly variantId: string | undefined,
    public readonly quantity: number,
    public readonly reason: string,
    public readonly storageId: string,
  ) {
    super();
  }
}

export class InventoryUnblockCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly blockTransactionId: string,
    public readonly quantity: number,
    public readonly reason: string,
  ) {
    super();
  }
}
