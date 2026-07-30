import { BaseQuery } from '@shared/cqrs';

export class GetAllSuppliersQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    public readonly isActive?: boolean,
    public readonly supplierType?: string,
  ) {
    super();
  }
}
