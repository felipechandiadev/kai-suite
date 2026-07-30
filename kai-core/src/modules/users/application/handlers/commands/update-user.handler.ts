import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject, NotFoundException } from '@nestjs/common';
import { UpdateUserCommand } from '../../commands/update-user.command';
import { UserUpdatedEvent } from '../../../domain/events/user-updated.event';
import { User, UserRole } from '../../../domain/user.entity';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@CommandHandler(UpdateUserCommand)
export class UpdateUserCommandHandler implements ICommandHandler<
  UpdateUserCommand,
  User
> {
  private readonly logger = new Logger(UpdateUserCommandHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    this.logger.debug(
      `[${command.currentUserId}] Updating user ${command.userId}`,
    );

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    const oldMail = user.mail;
    const oldRole = user.rol;

    if (command.userName !== undefined) user.userName = command.userName;
    if (command.mail !== undefined) user.mail = command.mail;
    if (command.role !== undefined) user.rol = command.role as UserRole;

    if (user.person) {
      if (command.phone !== undefined) {
        user.person.phone = command.phone || undefined;
      }
      if (command.personDni !== undefined) {
        user.person.documentNumber = command.personDni || undefined;
      }
      if (command.personName !== undefined) {
        const parsed = this.splitName(command.personName);
        user.person.firstName = parsed.firstName;
        user.person.lastName = parsed.lastName ?? undefined;
      }
    }

    const updated = await this.userRepository.save(user);

    const event = new UserUpdatedEvent(
      updated.id,
      command.mail !== undefined && command.mail !== oldMail
        ? command.mail
        : undefined,
      command.role !== undefined && command.role !== oldRole
        ? command.role
        : undefined,
    );
    event.aggregateVersion = 2;
    event.userId = command.currentUserId;
    event.correlationId = command.userId;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.currentUserId}] User ${command.userId} updated successfully`,
    );

    return updated;
  }

  private splitName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }
    const [firstName, ...rest] = trimmed.split(' ');
    return {
      firstName,
      lastName: rest.length > 0 ? rest.join(' ') : undefined,
    };
  }
}
