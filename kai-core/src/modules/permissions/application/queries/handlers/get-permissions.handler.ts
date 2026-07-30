import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetPermissionsQuery } from '../get-permissions.query';
import { PermissionRepositoryPort } from '../../ports/permission.repository.port';
import { Permission } from '../../../domain/permission.entity';

export interface GetPermissionsResult {
  permissions: Permission[];
  total: number;
  limit: number;
  offset: number;
}

@QueryHandler(GetPermissionsQuery)
export class GetPermissionsQueryHandler implements IQueryHandler<
  GetPermissionsQuery,
  GetPermissionsResult
> {
  constructor(
    @Inject('PermissionRepositoryPort')
    private readonly permissionRepository: PermissionRepositoryPort,
  ) {}

  async execute(query: GetPermissionsQuery): Promise<GetPermissionsResult> {
    const [permissions, total] = await this.permissionRepository.findAll(
      query.userId,
      query.ability,
      query.limit,
      query.offset,
    );

    return {
      permissions,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
