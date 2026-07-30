import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdatePermissionCommand } from '../update-permission.command';
import { PermissionRepositoryPort } from '../../ports/permission.repository.port';
import { PermissionUpdatedEvent } from '../../../domain/events/permission-updated.event';

@CommandHandler(UpdatePermissionCommand)
export class UpdatePermissionCommandHandler implements ICommandHandler<UpdatePermissionCommand> {
  constructor(
    @Inject('PermissionRepositoryPort')
    private readonly permissionRepository: PermissionRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdatePermissionCommand): Promise<void> {
    const permission = await this.permissionRepository.findById(
      command.permissionId,
    );
    if (!permission) {
      throw new Error(`Permission with id ${command.permissionId} not found`);
    }

    permission.update(command.description);

    await this.permissionRepository.save(permission);

    this.eventBus.publish(
      new PermissionUpdatedEvent(
        permission.id,
        permission.ability,
        permission.userId,
      ),
    );
  }
}
