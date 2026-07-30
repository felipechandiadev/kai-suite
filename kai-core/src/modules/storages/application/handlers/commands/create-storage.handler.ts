import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  CreateStorageCommand,
  UpdateStorageCommand,
  DeleteStorageCommand,
} from '@modules/storages/application/commands/create-storage.command';
import {
  STORAGES_REPOSITORY,
  StoragesRepositoryPort,
} from '@modules/storages/application/ports/storages.repository.port';
import { StorageDto } from '@modules/storages/application/dto/storage.dto';

@CommandHandler(CreateStorageCommand)
export class CreateStorageCommandHandler implements ICommandHandler<
  CreateStorageCommand,
  StorageDto
> {
  private readonly logger = new Logger(CreateStorageCommandHandler.name);

  constructor(
    @Inject(STORAGES_REPOSITORY)
    private readonly storagesRepository: StoragesRepositoryPort,
  ) {}

  async execute(command: CreateStorageCommand): Promise<StorageDto> {
    this.logger.debug(
      `[CreateStorageCommand] Creating storage: ${command.data.name}`,
    );

    const storage = await this.storagesRepository.create(command.data);

    this.logger.debug(
      `[CreateStorageCommand] Storage created successfully: ${storage.id}`,
    );
    return storage;
  }
}

@CommandHandler(UpdateStorageCommand)
export class UpdateStorageCommandHandler implements ICommandHandler<
  UpdateStorageCommand,
  StorageDto
> {
  private readonly logger = new Logger(UpdateStorageCommandHandler.name);

  constructor(
    @Inject(STORAGES_REPOSITORY)
    private readonly storagesRepository: StoragesRepositoryPort,
  ) {}

  async execute(command: UpdateStorageCommand): Promise<StorageDto> {
    this.logger.debug(`[UpdateStorageCommand] Updating storage ${command.id}`);

    const storage = await this.storagesRepository.update(
      command.id,
      command.data,
    );

    this.logger.debug(
      `[UpdateStorageCommand] Storage ${command.id} updated successfully`,
    );
    return storage;
  }
}

@CommandHandler(DeleteStorageCommand)
export class DeleteStorageCommandHandler implements ICommandHandler<
  DeleteStorageCommand,
  void
> {
  private readonly logger = new Logger(DeleteStorageCommandHandler.name);

  constructor(
    @Inject(STORAGES_REPOSITORY)
    private readonly storagesRepository: StoragesRepositoryPort,
  ) {}

  async execute(command: DeleteStorageCommand): Promise<void> {
    this.logger.debug(`[DeleteStorageCommand] Deleting storage ${command.id}`);

    await this.storagesRepository.delete(command.id);

    this.logger.debug(
      `[DeleteStorageCommand] Storage ${command.id} deleted successfully`,
    );
  }
}
