import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { CreatePermissionCommandHandler } from './application/commands/handlers/create-permission.handler';
import { UpdatePermissionCommandHandler } from './application/commands/handlers/update-permission.handler';
import { RemovePermissionCommandHandler } from './application/commands/handlers/remove-permission.handler';
import { GetPermissionsQueryHandler } from './application/queries/handlers/get-permissions.handler';
import { GetPermissionByIdQueryHandler } from './application/queries/handlers/get-permission-by-id.handler';
import { TypeOrmPermissionRepository } from './infrastructure/repositories/typeorm-permission.repository';
import { PermissionOrmEntity } from './infrastructure/orm-entities/permission.orm-entity';
import { PermissionsServiceAdapter } from './application/services/permissions.service.adapter';

const CommandHandlers = [
  CreatePermissionCommandHandler,
  UpdatePermissionCommandHandler,
  RemovePermissionCommandHandler,
];

const QueryHandlers = [
  GetPermissionsQueryHandler,
  GetPermissionByIdQueryHandler,
];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([PermissionOrmEntity])],
  controllers: [PermissionsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    PermissionsServiceAdapter,
    {
      provide: 'PermissionRepositoryPort',
      useClass: TypeOrmPermissionRepository,
    },
  ],
  exports: [
    PermissionsServiceAdapter,
    {
      provide: 'PermissionRepositoryPort',
      useClass: TypeOrmPermissionRepository,
    },
  ],
})
export class PermissionsModule {}
