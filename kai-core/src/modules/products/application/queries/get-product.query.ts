import { BaseQuery } from '@shared/cqrs';

export class GetProductQuery extends BaseQuery {
  constructor(public readonly productId: string) {
    super();
  }
}
