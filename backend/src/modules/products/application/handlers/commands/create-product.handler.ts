import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateProductCommand } from '../../commands/create-product.command';
import { ProductCreatedEvent } from '../../../domain/events/product-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '../../../domain/product.entity';
import { BrandsService } from '@modules/brands/application/brands.service';
import { ProductModeService } from '@shared/product-mode/product-mode.service';

@CommandHandler(CreateProductCommand)
export class CreateProductCommandHandler implements ICommandHandler<
  CreateProductCommand,
  Product
> {
  private readonly logger = new Logger(CreateProductCommandHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly eventBus: EventBus,
    private readonly brandsService: BrandsService,
    private readonly productModeService: ProductModeService,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    this.logger.debug(`Creating product: ${command.name}`);

    const productType = command.productType ?? ProductType.PHYSICAL;
    this.productModeService.assertProductTypeAllowed(productType);

    let brandLabel = command.brand;
    let brandId: string | null = command.brandId ?? null;
    if (brandId) {
      const b = await this.brandsService.assertBrandInCurrentCompany(brandId);
      brandLabel = b.name;
      brandId = b.id;
    }

    const product = this.productRepository.create({
      id: command.productId,
      name: command.name,
      categoryId: command.categoryId,
      brand: brandLabel,
      brandId,
      description: command.description,
      isActive: command.isActive,
      visibleInEShop: command.visibleInEShop,
      productType,
    });

    const saved = await this.productRepository.save(product);

    const event = new ProductCreatedEvent(
      saved.id,
      saved.name,
      saved.categoryId,
      saved.brand ?? undefined,
    );
    event.aggregateVersion = 1;
    event.correlationId = saved.id;

    this.eventBus.publish(event);
    this.logger.debug(`Product ${saved.id} created successfully`);

    // Convert ORM entity to domain entity
    return new Product({
      id: saved.id,
      name: saved.name,
      categoryId: saved.categoryId,
      brand: saved.brand,
      brandId: saved.brandId ?? null,
      description: saved.description,
      isActive: saved.isActive,
      visibleInEShop: saved.visibleInEShop,
      productType: saved.productType,
      taxIds: saved.taxIds,
      resultCenterId: saved.resultCenterId ?? null,
      baseUnitId: saved.baseUnitId,
      metadata: saved.metadata,
      changeHistory: saved.changeHistory,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      deletedAt: saved.deletedAt,
    });
  }
}
