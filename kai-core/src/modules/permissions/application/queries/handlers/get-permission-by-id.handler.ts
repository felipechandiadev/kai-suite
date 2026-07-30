import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetPermissionByIdQuery } from '../get-permission-by-id.query';
import { PermissionRepositoryPort } from '../../ports/permission.repository.port';
import { Permission } from '../../../domain/permission.entity';

@QueryHandler(GetPermissionByIdQuery)
export class GetPermissionByIdQueryHandler implements IQueryHandler<
  GetPermissionByIdQuery,
  Permission | null
> {
  constructor(
    @Inject('PermissionRepositoryPort')
    private readonly permissionRepository: PermissionRepositoryPort,
  ) {}

  async execute(query: GetPermissionByIdQuery): Promise<Permission | null> {
    return await this.permissionRepository.findById(query.permissionId);
  }
}
