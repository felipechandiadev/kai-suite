import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreatePermissionCommand } from '../create-permission.command';
import { PermissionRepositoryPort } from '../../ports/permission.repository.port';
import { Permission } from '../../../domain/permission.entity';
import { PermissionCreatedEvent } from '../../../domain/events/permission-created.event';

@CommandHandler(CreatePermissionCommand)
export class CreatePermissionCommandHandler implements ICommandHandler<CreatePermissionCommand> {
  constructor(
    @Inject('PermissionRepositoryPort')
    private readonly permissionRepository: PermissionRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreatePermissionCommand): Promise<void> {
    const permission = Permission.create(
      command.permissionId,
      command.ability,
      command.userId,
      command.description,
    );

    await this.permissionRepository.save(permission);

    this.eventBus.publish(
      new PermissionCreatedEvent(
        permission.id,
        permission.ability,
        permission.userId,
      ),
    );
  }
}
