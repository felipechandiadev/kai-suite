export class SearchTransactionsQuery {
  constructor(
    readonly page: number = 1,
    readonly limit: number = 25,
    readonly type?: string,
    readonly status?: string,
    readonly paymentMethod?: string,
    readonly branchId?: string,
    readonly pointOfSaleId?: string,
    readonly customerId?: string,
    readonly supplierId?: string,
    readonly dateFrom?: string,
    readonly dateTo?: string,
    readonly search?: string,
    /** Movimientos / tesorería: filtra por cuenta bancaria de la empresa. */
    readonly bankAccountKey?: string,
    /** Movimientos asociados a un centro de acopio. */
    readonly cashHubId?: string,
    /**
     * Si viene con elementos, filtra `tx.transactionType IN (...)` y tiene
     * prioridad sobre `type` (filtro simple).
     */
    readonly transactionTypes?: string[],
  ) {}
}
