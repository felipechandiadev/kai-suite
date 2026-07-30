import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { CreatePermissionCommand } from '../commands/create-permission.command';
import { UpdatePermissionCommand } from '../commands/update-permission.command';
import { RemovePermissionCommand } from '../commands/remove-permission.command';
import { GetPermissionsQuery } from '../queries/get-permissions.query';
import { GetPermissionByIdQuery } from '../queries/get-permission-by-id.query';
import { PermissionMapper } from '../mappers/permission.mapper';
import { PermissionResponseDto } from '../dto/permission-response.dto';
import { GetPermissionsResult } from '../queries/handlers/get-permissions.handler';

@Injectable()
export class PermissionsServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createPermission(
    ability: string,
    userId?: string,
    description?: string,
  ): Promise<PermissionResponseDto> {
    const permissionId = uuidv4();

    await this.commandBus.execute(
      new CreatePermissionCommand(permissionId, ability, userId, description),
    );

    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(permissionId),
    );

    return PermissionMapper.toResponseDto(permission);
  }

  async updatePermission(
    permissionId: string,
    description?: string,
    currentUserId: string = 'system',
  ): Promise<PermissionResponseDto> {
    await this.commandBus.execute(
      new UpdatePermissionCommand(permissionId, currentUserId, description),
    );

    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(permissionId),
    );

    return PermissionMapper.toResponseDto(permission);
  }

  async removePermission(
    permissionId: string,
    currentUserId: string = 'system',
  ): Promise<void> {
    await this.commandBus.execute(
      new RemovePermissionCommand(permissionId, currentUserId),
    );
  }

  async getPermissions(
    userId?: string,
    ability?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    permissions: PermissionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const result = await this.queryBus.execute(
      new GetPermissionsQuery(userId, ability, limit, offset),
    );

    return {
      permissions: PermissionMapper.toResponseDtoList(result.permissions),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  async getPermissionById(
    permissionId: string,
  ): Promise<PermissionResponseDto | null> {
    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(permissionId),
    );

    return permission ? PermissionMapper.toResponseDto(permission) : null;
  }
}
