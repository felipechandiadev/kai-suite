import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { CreateUserCommand } from '../../commands/create-user.command';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../../domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { UserRepositoryPort } from '../../ports/user.repository.port';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements ICommandHandler<
  CreateUserCommand,
  User
> {
  private readonly logger = new Logger(CreateUserCommandHandler.name);

  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.debug(`[${command.userId}] Creating user ${command.userName}`);

    const hashedPassword = await bcrypt.hash(command.password, 10);

    const user = new User();
    user.id = command.userId;
    user.userName = command.userName;
    user.mail = command.mail;
    user.pass = hashedPassword;
    user.rol = (command.role as UserRole) || UserRole.OPERATOR;
    user.person = command.personId
      ? ({ id: command.personId } as Person)
      : undefined;

    const saved = await this.userRepository.save(user);

    const event = new UserCreatedEvent(
      saved.id,
      saved.userName,
      saved.mail,
      command.personId,
      saved.rol,
    );
    event.aggregateVersion = 1;
    event.userId = command.userId;
    event.correlationId = command.userId;

    this.eventBus.publish(event);
    this.logger.debug(
      `[${command.userId}] User ${saved.id} created successfully`,
    );

    return saved;
  }
}
