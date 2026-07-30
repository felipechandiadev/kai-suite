import { BaseQuery } from '@shared/cqrs';

export class GetAllEmployeesQuery extends BaseQuery {
  constructor(
    readonly includeTerminated?: boolean,
    readonly status?: string,
    readonly branchId?: string,
    readonly companyId?: string,
  ) {
    super();
  }
}
