export class UpdatePriceListCommand {
  constructor(
    readonly id: string,
    readonly name?: string,
    readonly priceListType?: string,
    readonly currency?: string,
    readonly validFrom?: Date,
    readonly validUntil?: Date,
    readonly priority?: number,
    readonly isDefault?: boolean,
    readonly isActive?: boolean,
    readonly description?: string | null,
  ) {}
}
