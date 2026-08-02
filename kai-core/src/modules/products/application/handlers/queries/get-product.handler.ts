import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { GetProductQuery } from '../../queries/get-product.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../domain/product.entity';
import { resolvePrimaryMultimediaPublicUrl } from '@modules/multimedia/application/utils/resolve-primary-multimedia.util';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

@QueryHandler(GetProductQuery)
export class GetProductQueryHandler implements IQueryHandler<
  GetProductQuery,
  Product
> {
  private readonly logger = new Logger(GetProductQueryHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(query: GetProductQuery): Promise<Product> {
    this.logger.debug(`Fetching product ${query.productId}`);

    const product = await this.productRepository.findOne({
      where: { id: query.productId, deletedAt: null as any },
      relations: ['category', 'catalogBrand'],
    });

    if (!product) {
      throw new NotFoundException(`Product ${query.productId} not found`);
    }

    // Convert ORM entity to domain entity
    const assets = await this.multimediaService.listByEntity('product', product.id);

    return new Product({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      brand: product.catalogBrand?.name ?? product.brand,
      brandId: product.brandId ?? null,
      description: product.description,
      isActive: product.isActive,
      visibleInEShop: product.visibleInEShop === true,
      onMenu: product.onMenu === true,
      productType: product.productType,
      taxIds: product.taxIds,
      primaryImageUrl: resolvePrimaryMultimediaPublicUrl(assets),
      mediaAssets: assets.map((asset) => ({
        id: asset.id,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        kind: asset.kind,
        isPrimary: asset.isPrimary === true,
      })),
      resultCenterId: product.resultCenterId ?? null,
      baseUnitId: product.baseUnitId,
      metadata: product.metadata,
      changeHistory: product.changeHistory,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    });
  }
}
