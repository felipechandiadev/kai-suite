export class GetSupplierPaymentContextQuery {
  constructor(
    readonly supplierId: string,
    readonly companyId: string,
  ) {}
}
