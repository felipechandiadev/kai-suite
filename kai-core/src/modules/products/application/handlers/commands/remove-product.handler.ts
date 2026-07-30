import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { RemoveProductCommand } from '../../commands/remove-product.command';
import { ProductRemovedEvent } from '../../../domain/events/product-removed.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';

@CommandHandler(RemoveProductCommand)
export class RemoveProductCommandHandler implements ICommandHandler<
  RemoveProductCommand,
  void
> {
  private readonly logger = new Logger(RemoveProductCommandHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveProductCommand): Promise<void> {
    this.logger.debug(`Removing product ${command.productId}`);

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${command.productId} not found`);
    }

    product.deletedAt = new Date();
    await this.productRepository.save(product);

    const event = new ProductRemovedEvent(command.productId, command.reason);

    event.aggregateVersion = 3;
    event.userId = command.currentUserId;
    event.correlationId = command.productId;

    this.eventBus.publish(event);
    this.logger.debug(`Product ${command.productId} removed successfully`);
  }
}
