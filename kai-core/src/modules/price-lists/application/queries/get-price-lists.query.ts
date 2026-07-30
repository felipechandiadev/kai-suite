export class GetAllPriceListsQuery {
  constructor(readonly includeInactive: boolean = false) {}
}

export class GetPriceListByIdQuery {
  constructor(readonly id: string) {}
}
