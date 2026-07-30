import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, NotFoundException, Inject } from '@nestjs/common';
import { RemoveCategoryCommand } from '../../commands/remove-category.command';
import { CategoryRemovedEvent } from '../../../domain/events/category-removed.event';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';

@CommandHandler(RemoveCategoryCommand)
export class RemoveCategoryCommandHandler implements ICommandHandler<
  RemoveCategoryCommand,
  void
> {
  private readonly logger = new Logger(RemoveCategoryCommandHandler.name);

  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly repository: CategoryRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveCategoryCommand): Promise<void> {
    this.logger.debug(`Removing category ${command.categoryId}`);

    const category = await this.repository.findById(command.categoryId);
    if (!category) {
      throw new NotFoundException(`Category ${command.categoryId} not found`);
    }

    await this.repository.softDelete(command.categoryId);

    const event = new CategoryRemovedEvent(command.categoryId, command.reason);
    event.aggregateVersion = 3;
    event.userId = command.currentUserId;
    event.correlationId = command.categoryId;

    this.eventBus.publish(event);
    this.logger.debug(`Category ${command.categoryId} removed successfully`);
  }
}
