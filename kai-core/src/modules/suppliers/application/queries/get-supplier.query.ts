import { BaseQuery } from '@shared/cqrs';

export class GetSupplierQuery extends BaseQuery {
  constructor(public readonly supplierId: string) {
    super();
  }
}
