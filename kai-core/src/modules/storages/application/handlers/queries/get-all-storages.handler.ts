import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  GetAllStoragesQuery,
  GetStorageByIdQuery,
} from '@modules/storages/application/queries/get-all-storages.query';
import {
  STORAGES_REPOSITORY,
  StoragesRepositoryPort,
} from '@modules/storages/application/ports/storages.repository.port';
import { StorageDto } from '@modules/storages/application/dto/storage.dto';

@QueryHandler(GetAllStoragesQuery)
export class GetAllStoragesQueryHandler implements IQueryHandler<
  GetAllStoragesQuery,
  StorageDto[]
> {
  private readonly logger = new Logger(GetAllStoragesQueryHandler.name);

  constructor(
    @Inject(STORAGES_REPOSITORY)
    private readonly storagesRepository: StoragesRepositoryPort,
  ) {}

  async execute(query: GetAllStoragesQuery): Promise<StorageDto[]> {
    this.logger.debug(
      `[GetAllStoragesQuery] Executing with includeInactive=${query.includeInactive}`,
    );

    const storages = await this.storagesRepository.findAll({
      activeOnly: !query.includeInactive,
      orderBy: 'name',
      limit: query.limit,
      offset: query.offset,
    });

    this.logger.debug(
      `[GetAllStoragesQuery] Found ${storages.length} storages`,
    );
    return storages;
  }
}

@QueryHandler(GetStorageByIdQuery)
export class GetStorageByIdQueryHandler implements IQueryHandler<
  GetStorageByIdQuery,
  StorageDto | null
> {
  private readonly logger = new Logger(GetStorageByIdQueryHandler.name);

  constructor(
    @Inject(STORAGES_REPOSITORY)
    private readonly storagesRepository: StoragesRepositoryPort,
  ) {}

  async execute(query: GetStorageByIdQuery): Promise<StorageDto | null> {
    this.logger.debug(`[GetStorageByIdQuery] Finding storage ${query.id}`);

    const storage = await this.storagesRepository.findById(query.id);

    if (!storage) {
      this.logger.warn(`[GetStorageByIdQuery] Storage ${query.id} not found`);
      return null;
    }

    this.logger.debug(`[GetStorageByIdQuery] Found storage ${query.id}`);
    return storage;
  }
}
