import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { GetAllCategoriesQuery } from '../../queries/get-all-categories.query';
import { Category } from '../../../domain/category.entity';
import { CategoryRepositoryPort } from '../../ports/category.repository.port';
import { CategoryWithCountsDto } from '../../dto/category-with-counts.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

interface CategoriesResponse {
  items: Category[] | CategoryWithCountsDto[];
  total: number;
  limit: number;
  offset: number;
}

@QueryHandler(GetAllCategoriesQuery)
export class GetAllCategoriesQueryHandler implements IQueryHandler<
  GetAllCategoriesQuery,
  CategoriesResponse
> {
  private readonly logger = new Logger(GetAllCategoriesQueryHandler.name);

  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly repository: CategoryRepositoryPort,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(query: GetAllCategoriesQuery): Promise<CategoriesResponse> {
    this.logger.debug(
      `Fetching categories with limit=${query.limit}, offset=${query.offset}, search=${query.search}`,
    );

    if (query.withCounts) {
      const items = await this.repository.findAllWithCounts();
      return {
        items,
        total: items.length,
        limit: query.limit,
        offset: query.offset,
      };
    } else {
      const { items, total } = await this.repository.findAllPaginated(
        query.limit,
        query.offset,
        query.search,
      );
      const enrichedItems = await Promise.all(
        items.map(async (category) => {
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
        }),
      );
      return {
        items: enrichedItems,
        total,
        limit: query.limit,
        offset: query.offset,
      };
    }
  }
}
