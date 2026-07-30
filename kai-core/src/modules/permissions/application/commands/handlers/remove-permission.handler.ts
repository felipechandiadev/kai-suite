import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RemovePermissionCommand } from '../remove-permission.command';
import { PermissionRepositoryPort } from '../../ports/permission.repository.port';
import { PermissionRemovedEvent } from '../../../domain/events/permission-removed.event';

@CommandHandler(RemovePermissionCommand)
export class RemovePermissionCommandHandler implements ICommandHandler<RemovePermissionCommand> {
  constructor(
    @Inject('PermissionRepositoryPort')
    private readonly permissionRepository: PermissionRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemovePermissionCommand): Promise<void> {
    const permission = await this.permissionRepository.findById(
      command.permissionId,
    );
    if (!permission) {
      throw new Error(`Permission with id ${command.permissionId} not found`);
    }

    permission.remove();

    await this.permissionRepository.delete(permission.id);

    this.eventBus.publish(
      new PermissionRemovedEvent(
        permission.id,
        permission.ability,
        permission.userId,
      ),
    );
  }
}
