import { BaseQuery } from '@shared/cqrs';

export class GetPermissionsQuery extends BaseQuery {
  constructor(
    public readonly userId?: string,
    public readonly ability?: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {
    super();
  }
}
