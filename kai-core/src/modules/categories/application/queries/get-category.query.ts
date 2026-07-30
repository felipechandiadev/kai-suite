import { BaseQuery } from '@shared/cqrs';

export class GetCategoryQuery extends BaseQuery {
  constructor(public readonly categoryId: string) {
    super();
  }
}
