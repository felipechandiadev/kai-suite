import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { CreateCategoryCommand } from '../../commands/create-category.command';
import { CategoryCreatedEvent } from '../../../domain/events/category-created.event';
import { Category } from '../../../domain/category.entity';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryCommandHandler implements ICommandHandler<
  CreateCategoryCommand,
  Category
> {
  private readonly logger = new Logger(CreateCategoryCommandHandler.name);

  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly repository: CategoryRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<Category> {
    this.logger.debug(`Creating category: ${command.name}`);

    const category = new Category();
    category.id = command.categoryId;
    category.name = command.name;
    category.description = command.description;
    category.parentId = command.parentId;
    category.sortOrder = command.sortOrder;
    category.isActive = command.isActive;
    category.resultCenterId = command.resultCenterId;

    const saved = await this.repository.save(category);

    const event = new CategoryCreatedEvent(
      saved.id,
      saved.name,
      undefined,
      saved.description,
      saved.parentId,
    );
    event.aggregateVersion = 1;
    event.correlationId = saved.id;

    this.eventBus.publish(event);
    this.logger.debug(`Category ${saved.id} created successfully`);

    return saved;
  }
}
