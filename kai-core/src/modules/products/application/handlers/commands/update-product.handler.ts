import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { UpdateProductCommand } from '../../commands/update-product.command';
import { ProductUpdatedEvent } from '../../../domain/events/product-updated.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../domain/product.entity';
import { BrandsService } from '@modules/brands/application/brands.service';
import { ProductEshopVisibilitySyncService } from '../../services/product-eshop-visibility-sync.service';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import { isSellableProductType } from '../../helpers/product-type-policy.util';

@CommandHandler(UpdateProductCommand)
export class UpdateProductCommandHandler implements ICommandHandler<
  UpdateProductCommand,
  Product
> {
  private readonly logger = new Logger(UpdateProductCommandHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly eventBus: EventBus,
    private readonly brandsService: BrandsService,
    private readonly eshopVisibilitySync: ProductEshopVisibilitySyncService,
    private readonly productModeService: ProductModeService,
  ) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    this.logger.debug(`Updating product ${command.productId}`);

    if (command.productType !== undefined) {
      this.productModeService.assertProductTypeAllowed(command.productType);
    }

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${command.productId} not found`);
    }

    const oldName = product.name;
    const oldActive = product.isActive;

    if (command.name !== undefined) product.name = command.name;
    if (command.description !== undefined)
      product.description = command.description;
    if (command.categoryId !== undefined)
      product.categoryId = command.categoryId;
    if (command.isActive !== undefined) product.isActive = command.isActive;
    if (command.productType !== undefined) product.productType = command.productType;

    if (command.visibleInEShop !== undefined) {
      product.visibleInEShop = command.visibleInEShop;
    }
    if (command.onMenu !== undefined) {
      product.onMenu = command.onMenu;
    }
    if (!isSellableProductType(product.productType)) {
      product.visibleInEShop = false;
      product.onMenu = false;
    }

    if (command.brandId !== undefined) {
      if (command.brandId == null || command.brandId === '') {
        product.brandId = null;
        product.brand =
          command.brand !== undefined ? (command.brand?.trim() ? command.brand.trim() : null) : null;
      } else {
        const b = await this.brandsService.assertBrandInCurrentCompany(command.brandId);
        product.brandId = b.id;
        product.brand = b.name;
      }
    } else if (command.brand !== undefined) {
      product.brand = command.brand;
    }

    const updated = await this.productRepository.save(product);

    if (updated.visibleInEShop === true && isSellableProductType(updated.productType)) {
      await this.eshopVisibilitySync.afterProductEshopVisibilitySet(
        updated.id,
        true,
      );
    }

    const event = new ProductUpdatedEvent(
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
    event.correlationId = command.productId;

    this.eventBus.publish(event);
    this.logger.debug(`Product ${updated.id} updated successfully`);

    // Convert ORM entity to domain entity
    return new Product({
      id: updated.id,
      name: updated.name,
      categoryId: updated.categoryId,
      brand: updated.brand,
      brandId: updated.brandId ?? null,
      description: updated.description,
      isActive: updated.isActive,
      visibleInEShop: updated.visibleInEShop,
      onMenu: updated.onMenu,
      productType: updated.productType,
      taxIds: updated.taxIds,
      resultCenterId: updated.resultCenterId ?? null,
      baseUnitId: updated.baseUnitId,
      metadata: updated.metadata,
      changeHistory: updated.changeHistory,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      deletedAt: updated.deletedAt,
    });
  }
}
