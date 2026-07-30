import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CategoryServiceAdapter } from '@modules/categories/application/category.service.adapter';
import { CreateCategoryCommand } from '@modules/categories/application/commands/create-category.command';
import { RemoveCategoryCommand } from '@modules/categories/application/commands/remove-category.command';
import { UpdateCategoryCommand } from '@modules/categories/application/commands/update-category.command';
import { GetAllCategoriesQuery } from '@modules/categories/application/queries/get-all-categories.query';
import { GetCategoryQuery } from '@modules/categories/application/queries/get-category.query';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('CategoryServiceAdapter', () => {
  let service: CategoryServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let multimediaService: {
    listByEntity: jest.Mock;
    unlink: jest.Mock;
    link: jest.Mock;
  };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    multimediaService = {
      listByEntity: jest.fn(),
      unlink: jest.fn(),
      link: jest.fn(),
    };

    service = new CategoryServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      multimediaService as unknown as MultimediaServiceAdapter,
    );
  });

  it('should dispatch GetAllCategoriesQuery and return items', async () => {
    queryBus.execute.mockResolvedValueOnce({ items: [{ id: 'cat-1' }] });

    const result = await service.findAll({ limit: 10, offset: 5, search: 'gold' });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllCategoriesQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      limit: 10,
      offset: 5,
      search: 'gold',
      withCounts: false,
    });
    expect(result).toEqual([{ id: 'cat-1' }]);
  });

  it('should dispatch GetCategoryQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ id: 'cat-1' });

    await service.findOne('cat-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetCategoryQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ categoryId: 'cat-1' });
  });

  it('should dispatch CreateCategoryCommand with generated id', async () => {
    const generatedId = '11111111-1111-4111-8111-111111111111';
    const randomUuidSpy = jest
      .spyOn(global.crypto, 'randomUUID')
      .mockReturnValue(generatedId);
    commandBus.execute.mockResolvedValueOnce({ id: generatedId });
    queryBus.execute.mockResolvedValueOnce({ id: generatedId, mediaAssets: [] });
    multimediaService.listByEntity.mockResolvedValueOnce([]);
    multimediaService.link.mockResolvedValue(undefined);

    await service.create({
      name: 'Rings',
      description: 'Jewelry',
      parentId: 'parent-1',
      sortOrder: 3,
      resultCenterId: 'rc-1',
      multimediaAssetIds: ['asset-1'],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateCategoryCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      categoryId: generatedId,
      name: 'Rings',
      description: 'Jewelry',
      parentId: 'parent-1',
      sortOrder: 3,
      isActive: true,
      resultCenterId: 'rc-1',
    });
    expect(multimediaService.listByEntity).toHaveBeenCalledWith(
      'category',
      generatedId,
    );
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-1',
      entityType: 'category',
      entityId: generatedId,
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });

    randomUuidSpy.mockRestore();
  });

  it('should dispatch UpdateCategoryCommand', async () => {
    commandBus.execute.mockResolvedValueOnce(undefined);
    multimediaService.listByEntity.mockResolvedValueOnce([{ id: 'old-asset' }]);
    multimediaService.unlink.mockResolvedValue(undefined);
    multimediaService.link.mockResolvedValue(undefined);
    queryBus.execute.mockResolvedValueOnce({ id: 'cat-1', mediaAssets: [] });

    await service.update('cat-1', {
      name: 'Updated name',
      description: 'Updated description',
      isActive: false,
      sortOrder: 7,
      parentId: 'parent-2',
      multimediaAssetIds: ['asset-2'],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateCategoryCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      categoryId: 'cat-1',
      currentUserId: '',
      name: 'Updated name',
      description: 'Updated description',
      isActive: false,
      sortOrder: 7,
      parentId: 'parent-2',
    });
    expect(multimediaService.listByEntity).toHaveBeenCalledWith('category', 'cat-1');
    expect(multimediaService.unlink).toHaveBeenCalledWith({
      assetId: 'old-asset',
      entityType: 'category',
      entityId: 'cat-1',
    });
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-2',
      entityType: 'category',
      entityId: 'cat-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
  });

  it('should dispatch RemoveCategoryCommand', async () => {
    commandBus.execute.mockResolvedValueOnce(undefined);

    await service.remove('cat-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(RemoveCategoryCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      categoryId: 'cat-1',
      currentUserId: '',
      reason: 'User requested deletion',
    });
  });

  it('should request categories with counts', async () => {
    queryBus.execute.mockResolvedValueOnce({ items: [{ id: 'cat-1', productCount: 2, childCount: 1 }] });

    const result = await service.getCategoriesWithCounts();

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllCategoriesQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      limit: 1000,
      offset: 0,
      search: undefined,
      withCounts: true,
    });
    expect(result).toEqual([{ id: 'cat-1', productCount: 2, childCount: 1 }]);
  });
});