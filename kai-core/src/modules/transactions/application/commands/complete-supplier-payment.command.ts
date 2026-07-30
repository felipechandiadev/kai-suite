export class CompleteSupplierPaymentCommand {
  constructor(
    readonly paymentId: string,
    readonly paymentMethod: string,
    readonly bankAccountKey?: string,
    readonly supplierBankAccount?: string,
    readonly companyBankAccount?: string,
    readonly note?: string,
  ) {}
}
