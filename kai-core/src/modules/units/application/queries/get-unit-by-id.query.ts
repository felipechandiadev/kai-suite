import { BaseQuery } from '@shared/cqrs';

export class GetUnitByIdQuery extends BaseQuery {
  constructor(public readonly unitId: string) {
    super();
  }
}
