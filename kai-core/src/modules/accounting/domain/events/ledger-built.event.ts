export class LedgerBuiltEvent {
  constructor(
    public readonly ledgerId: string,
    public readonly accountId: string,
    public readonly amount: number,
    public readonly timestamp: Date,
  ) {}
}