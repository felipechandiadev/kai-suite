import { BaseQuery } from '@shared/cqrs';

export class GetEmployeeByIdQuery extends BaseQuery {
  constructor(readonly id: string) {
    super();
  }
}
