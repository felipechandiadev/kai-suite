import { Test, TestingModule } from '@nestjs/testing';
import { GetAllCategoriesQueryHandler } from '@modules/categories/application/handlers/queries/get-all-categories.handler';
import { GetAllCategoriesQuery } from '@modules/categories/application/queries/get-all-categories.query';
import { CategoryRepositoryPort } from '@modules/categories/application/ports/category.repository.port';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('GetAllCategoriesQueryHandler', () => {
  let handler: GetAllCategoriesQueryHandler;
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
        GetAllCategoriesQueryHandler,
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

    handler = module.get(GetAllCategoriesQueryHandler);
  });

  it('should return paginated categories when withCounts is false', async () => {
    repository.findAllPaginated.mockResolvedValueOnce({
      items: [{ id: 'cat-1', name: 'Rings' } as any],
      total: 1,
    });

    const result = await handler.execute(new GetAllCategoriesQuery(20, 10, 'ring', false));

    expect(repository.findAllPaginated).toHaveBeenCalledWith(20, 10, 'ring');
    expect(multimediaService.listByEntity).toHaveBeenCalledWith('category', 'cat-1');
    expect(result).toEqual({
      items: [
        {
          id: 'cat-1',
          name: 'Rings',
          primaryImageUrl: null,
          mediaAssets: [],
        },
      ],
      total: 1,
      limit: 20,
      offset: 10,
    });
  });

  it('should return counted categories when withCounts is true', async () => {
    repository.findAllWithCounts.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Rings', productCount: 2, childCount: 1 },
    ]);

    const result = await handler.execute(new GetAllCategoriesQuery(100, 0, undefined, true));

    expect(repository.findAllWithCounts).toHaveBeenCalledTimes(1);
    expect(repository.findAllPaginated).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [{ id: 'cat-1', name: 'Rings', productCount: 2, childCount: 1 }],
      total: 1,
      limit: 100,
      offset: 0,
    });
  });
});