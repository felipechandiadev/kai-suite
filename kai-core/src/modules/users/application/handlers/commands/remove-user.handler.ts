import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject, NotFoundException } from '@nestjs/common';
import { RemoveUserCommand } from '../../commands/remove-user.command';
import { UserRemovedEvent } from '../../../domain/events/user-removed.event';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@CommandHandler(RemoveUserCommand)
export class RemoveUserCommandHandler implements ICommandHandler<
  RemoveUserCommand,
  void
> {
  private readonly logger = new Logger(RemoveUserCommandHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveUserCommand): Promise<void> {
    this.logger.debug(`[${command.id}] Removing user ${command.userId}`);

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    await this.userRepository.delete(command.userId);

    const event = new UserRemovedEvent(command.userId, command.reason);

    event.aggregateVersion = 3;
    event.userId = command.currentUserId;
    event.correlationId = command.id;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.id}] User ${command.userId} removed successfully`,
    );
  }
}
