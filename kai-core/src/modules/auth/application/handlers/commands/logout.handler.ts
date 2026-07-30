import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { LogoutCommand } from '../../commands/logout.command';
import { LogoutEvent } from '../../../domain/events/logout.event';

export interface LogoutResult {
  success: boolean;
}

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<
  LogoutCommand,
  LogoutResult
> {
  private readonly logger = new Logger(LogoutCommandHandler.name);

  constructor(private readonly eventBus: EventBus) {}

  async execute(command: LogoutCommand): Promise<LogoutResult> {
    this.logger.debug(`Logout for user: ${command.userId}`);

    const event = new LogoutEvent(command.userId);
    event.aggregateId = command.userId;
    event.aggregateVersion = 1;
    event.correlationId = command.userId;

    this.eventBus.publish(event);
    this.logger.debug(`User logged out: ${command.userId}`);

    return { success: true };
  }
}
