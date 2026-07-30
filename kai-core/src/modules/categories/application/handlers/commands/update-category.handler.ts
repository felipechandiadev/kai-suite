import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, NotFoundException, Inject } from '@nestjs/common';
import { UpdateCategoryCommand } from '../../commands/update-category.command';
import { CategoryUpdatedEvent } from '../../../domain/events/category-updated.event';
import { Category } from '../../../domain/category.entity';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryCommandHandler implements ICommandHandler<
  UpdateCategoryCommand,
  Category
> {
  private readonly logger = new Logger(UpdateCategoryCommandHandler.name);

  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly repository: CategoryRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<Category> {
    this.logger.debug(`Updating category ${command.categoryId}`);

    const category = await this.repository.findById(command.categoryId);
    if (!category) {
      throw new NotFoundException(`Category ${command.categoryId} not found`);
    }

    const oldName = category.name;
    const oldActive = category.isActive;

    const updateData: Partial<Category> = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.description !== undefined)
      updateData.description = command.description;
    if (command.isActive !== undefined) updateData.isActive = command.isActive;
    if (command.sortOrder !== undefined)
      updateData.sortOrder = command.sortOrder;
    if (command.parentId !== undefined) updateData.parentId = command.parentId;

    const updated = await this.repository.update(
      command.categoryId,
      updateData,
    );

    const event = new CategoryUpdatedEvent(
      updated.id,
      command.name !== undefined && command.name !== oldName
        ? command.name
        : undefined,
      command.description,
      command.isActive !== undefined && command.isActive !== oldActive
        ? command.isActive
        : undefined,
    );
    event.aggregateVersion = 2;
    event.userId = command.currentUserId;
    event.correlationId = command.categoryId;

    this.eventBus.publish(event);
    this.logger.debug(`Category ${command.categoryId} updated successfully`);

    return updated;
  }
}
