import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetCategoryQueryHandler } from '@modules/categories/application/handlers/queries/get-category.handler';
import { GetCategoryQuery } from '@modules/categories/application/queries/get-category.query';
import { CategoryRepositoryPort } from '@modules/categories/application/ports/category.repository.port';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('GetCategoryQueryHandler', () => {
  let handler: GetCategoryQueryHandler;
  let repository: jest.Mocked<CategoryRepositoryPort>;
  let multimediaService: { listByEntity: jest.Mock };

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllWithCounts: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    multimediaService = { listByEntity: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoryQueryHandler,
        {
          provide: 'CategoryRepositoryPort',
          useValue: repository,
        },
        {
          provide: MultimediaServiceAdapter,
          useValue: multimediaService,
        },
      ],
    }).compile();

    handler = module.get(GetCategoryQueryHandler);
  });

  it('should return the category when it exists', async () => {
    repository.findById.mockResolvedValueOnce({ id: 'cat-1', name: 'Rings' } as any);

    const result = await handler.execute(new GetCategoryQuery('cat-1'));

    expect(repository.findById).toHaveBeenCalledWith('cat-1');
    expect(multimediaService.listByEntity).toHaveBeenCalledWith('category', 'cat-1');
    expect(result).toMatchObject({
      id: 'cat-1',
      name: 'Rings',
      primaryImageUrl: null,
      mediaAssets: [],
    });
  });

  it('should throw when category does not exist', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetCategoryQuery('missing'))).rejects.toThrow(
      new NotFoundException('Category missing not found'),
    );
  });
});