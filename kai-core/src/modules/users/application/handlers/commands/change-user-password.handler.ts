import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject, NotFoundException } from '@nestjs/common';
import { ChangeUserPasswordCommand } from '../../commands/change-user-password.command';
import { UserPasswordChangedEvent } from '../../../domain/events/user-password-changed.event';
import * as bcrypt from 'bcryptjs';
import { User } from '../../../domain/user.entity';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@CommandHandler(ChangeUserPasswordCommand)
export class ChangeUserPasswordCommandHandler implements ICommandHandler<
  ChangeUserPasswordCommand,
  void
> {
  private readonly logger = new Logger(ChangeUserPasswordCommandHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ChangeUserPasswordCommand): Promise<void> {
    this.logger.debug(`[${command.userId}] Changing password`);

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    const hashedPassword = await bcrypt.hash(command.newPassword, 10);
    user.pass = hashedPassword;

    await this.userRepository.save(user);

    const event = new UserPasswordChangedEvent(command.userId);

    event.aggregateVersion = 4;
    event.userId = command.currentUserId;
    event.correlationId = command.userId;

    this.eventBus.publish(event);
    this.logger.debug(
      `Password changed successfully for user ${command.userId}`,
    );
  }
}
