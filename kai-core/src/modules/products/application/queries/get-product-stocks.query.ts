import { BaseQuery } from '@shared/cqrs';

export class GetProductStocksQuery extends BaseQuery {
  constructor(public readonly productId: string) {
    super();
  }
}
