import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Storage } from './domain/storage.entity';
import { StoragesService } from './application/storages.service';
import { StoragesServiceAdapter } from './application/storages.service.adapter';
import { StoragesController } from './presentation/storages.controller';
import {
  GetAllStoragesQueryHandler,
  GetStorageByIdQueryHandler,
} from './application/handlers/queries/get-all-storages.handler';
import {
  CreateStorageCommandHandler,
  UpdateStorageCommandHandler,
  DeleteStorageCommandHandler,
} from './application/handlers/commands/create-storage.handler';
import { StorageOrmEntity } from './infrastructure/orm-mappers/storage.orm-entity';
import { STORAGES_REPOSITORY } from './application/ports/storages.repository.port';
import { StoragesRepository } from './infrastructure/repositories/storages.repository';
import { HrLaborUnitsModule } from '@modules/hr-labor-units/hr-labor-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Storage, StorageOrmEntity]),
    CqrsModule,
    HrLaborUnitsModule,
  ],
  controllers: [StoragesController],
  providers: [
    StoragesService,
    StoragesServiceAdapter,
    {
      provide: STORAGES_REPOSITORY,
      useClass: StoragesRepository,
    },
    GetAllStoragesQueryHandler,
    GetStorageByIdQueryHandler,
    CreateStorageCommandHandler,
    UpdateStorageCommandHandler,
    DeleteStorageCommandHandler,
  ],
  exports: [StoragesService, StoragesServiceAdapter],
})
export class StoragesModule {}
