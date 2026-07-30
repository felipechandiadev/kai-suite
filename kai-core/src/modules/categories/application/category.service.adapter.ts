import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCategoryCommand } from './commands/create-category.command';
import { UpdateCategoryCommand } from './commands/update-category.command';
import { RemoveCategoryCommand } from './commands/remove-category.command';
import { GetAllCategoriesQuery } from './queries/get-all-categories.query';
import { GetCategoryQuery } from './queries/get-category.query';
import { CategoryWithCountsDto } from './dto/category-with-counts.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

/**
 * CQRS-backed category API. Intentionally does not extend the legacy
 * `CategoryService`: subclassing would make Nest inject the parent constructor
 * dependencies into the `CommandBus` / `QueryBus` parameter slots.
 */
@Injectable()
export class CategoryServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly multimediaAdapter: MultimediaServiceAdapter,
  ) {}

  async findAll(query: any) {
    const result = await this.queryBus.execute(
      new GetAllCategoriesQuery(
        query?.limit || 100,
        query?.offset || 0,
        query?.search,
        false,
      ),
    );
    return result.items;
  }

  async findOne(id: string) {
    return this.queryBus.execute(new GetCategoryQuery(id));
  }

  async create(data: any) {
    const { multimediaAssetIds, ...payload } = data;
    const created = await this.commandBus.execute(
      new CreateCategoryCommand(
        crypto.randomUUID(), // Generate ID
        payload.name,
        payload.description,
        payload.parentId,
        payload.sortOrder || 0,
        payload.isActive !== false,
        payload.resultCenterId,
      ),
    );
    await this.syncMediaLinks(created.id, multimediaAssetIds);
    return this.findOne(created.id);
  }

  async update(id: string, data: any) {
    const { multimediaAssetIds, ...payload } = data;
    await this.commandBus.execute(
      new UpdateCategoryCommand(
        id,
        '', // currentUserId
        payload.name,
        payload.description,
        payload.isActive,
        payload.sortOrder,
        payload.parentId,
      ),
    );
    await this.syncMediaLinks(id, multimediaAssetIds);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.commandBus.execute(
      new RemoveCategoryCommand(
        id,
        '', // currentUserId
        'User requested deletion',
      ),
    );
  }

  async getCategoriesWithCounts(): Promise<CategoryWithCountsDto[]> {
    const result = await this.queryBus.execute(
      new GetAllCategoriesQuery(1000, 0, undefined, true),
    );
    return result.items as CategoryWithCountsDto[];
  }

  private async syncMediaLinks(
    categoryId: string,
    multimediaAssetIds?: string[],
  ): Promise<void> {
    if (!Array.isArray(multimediaAssetIds)) {
      return;
    }

    const existingAssets = await this.multimediaAdapter.listByEntity(
      'category',
      categoryId,
    );

    await Promise.all(
      existingAssets.map((asset) =>
        this.multimediaAdapter.unlink({
          assetId: asset.id,
          entityType: 'category',
          entityId: categoryId,
        }),
      ),
    );

    await Promise.all(
      multimediaAssetIds.map((assetId, index) =>
        this.multimediaAdapter.link({
          assetId,
          entityType: 'category',
          entityId: categoryId,
          usageType: 'primary-image',
          sortOrder: index,
          isPrimary: index === 0,
        }),
      ),
    );
  }
}
