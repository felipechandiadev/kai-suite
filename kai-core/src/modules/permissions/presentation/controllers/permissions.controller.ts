import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreatePermissionDto } from '../../application/dto/create-permission.dto';
import { UpdatePermissionDto } from '../../application/dto/update-permission.dto';
import { PermissionResponseDto } from '../../application/dto/permission-response.dto';
import { PermissionMapper } from '../../application/mappers/permission.mapper';
import { CreatePermissionCommand } from '../../application/commands/create-permission.command';
import { UpdatePermissionCommand } from '../../application/commands/update-permission.command';
import { RemovePermissionCommand } from '../../application/commands/remove-permission.command';
import { GetPermissionsQuery } from '../../application/queries/get-permissions.query';
import { GetPermissionByIdQuery } from '../../application/queries/get-permission-by-id.query';
import { GetPermissionsResult } from '../../application/queries/handlers/get-permissions.handler';
import { v4 as uuidv4 } from 'uuid';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPermission(
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permissionId = uuidv4();

    await this.commandBus.execute(
      new CreatePermissionCommand(
        permissionId,
        dto.ability,
        dto.userId,
        dto.description,
      ),
    );

    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(permissionId),
    );

    return PermissionMapper.toResponseDto(permission);
  }

  @Get()
  async getPermissions(
    @Query('userId') userId?: string,
    @Query('ability') ability?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    permissions: PermissionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const result = await this.queryBus.execute(
      new GetPermissionsQuery(
        userId,
        ability,
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      ),
    );

    return {
      permissions: PermissionMapper.toResponseDtoList(result.permissions),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  @Get(':id')
  async getPermissionById(
    @Param('id') id: string,
  ): Promise<PermissionResponseDto> {
    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(id),
    );

    if (!permission) {
      throw new Error(`Permission with id ${id} not found`);
    }

    return PermissionMapper.toResponseDto(permission);
  }

  @Put(':id')
  async updatePermission(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    await this.commandBus.execute(
      new UpdatePermissionCommand(id, 'current-user-id', dto.description), // TODO: Get from auth context
    );

    const permission = await this.queryBus.execute(
      new GetPermissionByIdQuery(id),
    );

    return PermissionMapper.toResponseDto(permission);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(
      new RemovePermissionCommand(id, 'current-user-id'), // TODO: Get from auth context
    );
  }
}
