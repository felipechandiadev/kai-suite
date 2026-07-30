import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException, Inject } from '@nestjs/common';
import { GetCategoryQuery } from '../../queries/get-category.query';
import { Category } from '../../../domain/category.entity';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

@QueryHandler(GetCategoryQuery)
export class GetCategoryQueryHandler implements IQueryHandler<
  GetCategoryQuery,
  Category
> {
  private readonly logger = new Logger(GetCategoryQueryHandler.name);

  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly repository: CategoryRepositoryPort,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(query: GetCategoryQuery): Promise<Category> {
    this.logger.debug(`Fetching category ${query.categoryId}`);

    const category = await this.repository.findById(query.categoryId);

    if (!category) {
      throw new NotFoundException(`Category ${query.categoryId} not found`);
    }

    const assets = await this.multimediaService.listByEntity(
      'category',
      category.id,
    );
    category.primaryImageUrl = assets[0]?.publicUrl ?? null;
    category.mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));

    return category;
  }
}
