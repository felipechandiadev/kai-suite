import { BaseQuery } from '@shared/cqrs';

export class GetAllUsersQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    public readonly search?: string,
  ) {
    super();
  }
}
