import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from './commands/create-product.command';
import { UpdateProductCommand } from './commands/update-product.command';
import { RemoveProductCommand } from './commands/remove-product.command';
import { SearchProductsQuery } from './queries/search-products.query';
import { GetProductQuery } from './queries/get-product.query';
import { GetAllProductsQuery } from './queries/get-all-products.query';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { ProductModeService } from '@shared/product-mode/product-mode.service';
import { ProductType } from '../domain/product.entity';
import * as crypto from 'crypto';

@Injectable()
export class ProductsServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly productModeService: ProductModeService,
  ) {}

  async search(dto: any) {
    const query = new SearchProductsQuery(
      dto.query || '',
      dto.page || 1,
      dto.pageSize || 10,
      dto.priceListId,
      dto.productType,
    );
    return this.queryBus.execute(query);
  }

  async findOne(id: string) {
    const query = new GetProductQuery(id);
    return this.queryBus.execute(query);
  }

  async findAll(filter?: any) {
    const query = new GetAllProductsQuery(
      filter?.limit || 100,
      filter?.offset || 0,
      filter?.search,
    );
    return this.queryBus.execute(query);
  }

  async create(data: any) {
    const { multimediaAssetIds, ...payload } = data;
    this.productModeService.assertProductTypeAllowed(
      payload.productType ?? ProductType.PHYSICAL,
    );
    const command = new CreateProductCommand(
      crypto.randomUUID(),
      payload.name,
      payload.categoryId,
      payload.brand,
      payload.description,
      payload.isActive !== false,
      payload.visibleInEShop === true,
      payload.onMenu === true,
      payload.productType,
      payload.brandId ?? null,
    );
    const created = await this.commandBus.execute(command);
    await this.syncMediaLinks(created.id, multimediaAssetIds);
    return this.findOne(created.id);
  }

  async update(id: string, data: any) {
    const { multimediaAssetIds, ...payload } = data;
    if (payload.productType !== undefined) {
      this.productModeService.assertProductTypeAllowed(payload.productType);
    }
    const command = new UpdateProductCommand(
      id,
      'system-user',
      payload.name,
      payload.description,
      payload.brand,
      payload.categoryId,
      payload.isActive,
      payload.visibleInEShop,
      payload.onMenu,
      payload.productType,
      payload.brandId,
    );
    await this.commandBus.execute(command);
    await this.syncMediaLinks(id, multimediaAssetIds);
    return this.findOne(id);
  }

  async remove(id: string) {
    const command = new RemoveProductCommand(id, 'system-user');
    return this.commandBus.execute(command);
  }

  // For POS stocks endpoint we keep a query in CQRS
  async getStocks(productId: string) {
    const query = new GetProductQuery(productId); // handler should include stocks or create specific stocks query
    return this.queryBus.execute(query);
  }

  private async syncMediaLinks(
    productId: string,
    multimediaAssetIds?: string[],
  ): Promise<void> {
    if (!Array.isArray(multimediaAssetIds)) {
      return;
    }

    const existingAssets = await this.multimediaService.listByEntity(
      'product',
      productId,
    );

    await Promise.all(
      existingAssets.map((asset) =>
        this.multimediaService.unlink({
          assetId: asset.id,
          entityType: 'product',
          entityId: productId,
        }),
      ),
    );

    await Promise.all(
      multimediaAssetIds.map((assetId, index) =>
        this.multimediaService.link({
          assetId,
          entityType: 'product',
          entityId: productId,
          usageType: 'primary-image',
          sortOrder: index,
          isPrimary: index === 0,
        }),
      ),
    );
  }
}
