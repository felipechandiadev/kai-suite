import { BaseQuery } from '@shared/cqrs';

export class GetUserQuery extends BaseQuery {
  constructor(public readonly userId: string) {
    super();
  }
}
