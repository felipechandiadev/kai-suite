import { BaseQuery } from '@shared/cqrs';

export class GetAllUnitsQuery extends BaseQuery {
  constructor(public readonly status?: string) {
    super();
  }
}
