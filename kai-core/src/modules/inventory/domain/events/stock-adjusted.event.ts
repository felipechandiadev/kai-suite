export class StockAdjustedEvent {
  constructor(
    public readonly variantId: string,
    public readonly storageId: string,
    public readonly previousQty: number,
    public readonly newQty: number,
    public readonly diff: number,
    public readonly adjustmentType: 'IN' | 'OUT',
    public readonly reason?: string,
  ) {}
}

export class StockTransferredEvent {
  constructor(
    public readonly variantId: string,
    public readonly sourceStorageId: string,
    public readonly targetStorageId: string,
    public readonly quantity: number,
    public readonly documentNumbers: [string, string],
  ) {}
}

export class PMPRecalculatedEvent {
  constructor(
    public readonly variantId: string,
    public readonly storageId: string,
    public readonly previousPmp: number,
    public readonly newPmp: number,
  ) {}
}

export class InventoryValueChangedEvent {
  constructor(
    public readonly variantId: string,
    public readonly storageId: string,
    public readonly previousValue: number,
    public readonly newValue: number,
    public readonly valueDiff: number,
  ) {}
}
