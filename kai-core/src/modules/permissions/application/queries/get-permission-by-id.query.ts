import { BaseQuery } from '@shared/cqrs';

export class GetPermissionByIdQuery extends BaseQuery {
  constructor(public readonly permissionId: string) {
    super();
  }
}
