import { TypeOrmCategoryRepository } from '@modules/categories/infrastructure/repositories/typeorm-category.repository';

describe('TypeOrmCategoryRepository', () => {
  let repository: TypeOrmCategoryRepository;
  let categoryRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
  };
  let productRepository: {
    createQueryBuilder: jest.Mock;
  };
  let productQueryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };
  let categoryQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    productQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    categoryQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    categoryRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(categoryQueryBuilder),
      update: jest.fn(),
    };

    productRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(productQueryBuilder),
    };

    repository = new TypeOrmCategoryRepository(categoryRepository as any, productRepository as any);
  });

  it('should save a category', async () => {
    const category = { id: 'cat-1', name: 'Hardware' };
    categoryRepository.save.mockResolvedValueOnce(category);

    const result = await repository.save(category as any);

    expect(categoryRepository.save).toHaveBeenCalledWith(category);
    expect(result).toBe(category);
  });

  it('should find category by id excluding soft deleted records', async () => {
    categoryRepository.findOne.mockResolvedValueOnce({ id: 'cat-1' });

    const result = await repository.findById('cat-1');

    expect(categoryRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'cat-1', deletedAt: null as any },
    });
    expect(result).toMatchObject({ id: 'cat-1' });
  });

  it('should list active categories ordered by name', async () => {
    categoryRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(categoryRepository.find).toHaveBeenCalledWith({
      where: { deletedAt: null as any },
      order: { name: 'ASC' },
    });
  });

  it('should return categories with child and product counts', async () => {
    categoryRepository.find.mockResolvedValueOnce([
      { id: 'parent', name: 'Parent' },
      { id: 'child', name: 'Child', parentId: 'parent' },
    ]);
    productQueryBuilder.getRawMany.mockResolvedValueOnce([
      { categoryId: 'parent', count: '3' },
      { categoryId: 'child', count: '1' },
    ]);

    const result = await repository.findAllWithCounts();

    expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
    expect(productQueryBuilder.andWhere).toHaveBeenCalledWith('product.isActive = :isActive', {
      isActive: true,
    });
    expect(productQueryBuilder.andWhere).toHaveBeenCalledWith(
      'product.categoryId IN (:...categoryIds)',
      { categoryIds: ['parent', 'child'] },
    );
    expect(result).toEqual([
      {
        id: 'parent',
        name: 'Parent',
        parentId: undefined,
        productCount: 3,
        childCount: 1,
      },
      {
        id: 'child',
        name: 'Child',
        parentId: 'parent',
        productCount: 1,
        childCount: 0,
      },
    ]);
  });

  it('should update and reload a category', async () => {
    categoryRepository.update.mockResolvedValueOnce(undefined);
    categoryRepository.findOne.mockResolvedValueOnce({ id: 'cat-1', name: 'Updated' });

    const result = await repository.update('cat-1', { name: 'Updated' });

    expect(categoryRepository.update).toHaveBeenCalledWith('cat-1', { name: 'Updated' });
    expect(result).toMatchObject({ id: 'cat-1', name: 'Updated' });
  });

  it('should search and paginate categories', async () => {
    categoryQueryBuilder.getCount.mockResolvedValueOnce(2);
    categoryQueryBuilder.getMany.mockResolvedValueOnce([{ id: 'cat-1' }]);

    const result = await repository.findAllPaginated(10, 20, ' hard ');

    expect(categoryRepository.createQueryBuilder).toHaveBeenCalledWith('category');
    expect(categoryQueryBuilder.where).toHaveBeenCalledWith('category.deletedAt IS NULL');
    expect(categoryQueryBuilder.andWhere).toHaveBeenCalledWith(
      'LOWER(category.name) LIKE :q OR LOWER(category.description) LIKE :q',
      { q: '%hard%' },
    );
    expect(categoryQueryBuilder.orderBy).toHaveBeenCalledWith('category.name', 'ASC');
    expect(categoryQueryBuilder.limit).toHaveBeenCalledWith(10);
    expect(categoryQueryBuilder.offset).toHaveBeenCalledWith(20);
    expect(result).toEqual({ items: [{ id: 'cat-1' }], total: 2 });
  });

  it('should soft delete a category by setting deletedAt', async () => {
    categoryRepository.update.mockResolvedValueOnce(undefined);

    await repository.softDelete('cat-1');

    expect(categoryRepository.update).toHaveBeenCalledWith(
      'cat-1',
      expect.objectContaining({ deletedAt: expect.any(Date) }),
    );
  });
});