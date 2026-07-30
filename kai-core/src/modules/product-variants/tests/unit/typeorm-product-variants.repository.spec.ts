import { TypeOrmProductVariantsRepository } from '@modules/product-variants/infrastructure/repositories/typeorm-product-variants.repository';

describe('TypeOrmProductVariantsRepository', () => {
  let repository: TypeOrmProductVariantsRepository;
  let ormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataSource: {
    getRepository: jest.Mock;
  };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(ormRepository),
    };

    repository = new TypeOrmProductVariantsRepository(dataSource as any);
  });

  it('should create and save a product variant', async () => {
    const variant = { id: 'variant-1', sku: 'SKU-1' };
    const entity = { ...variant, persisted: false };
    const saved = { ...variant, persisted: true };
    ormRepository.create.mockReturnValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce(saved);

    const result = await repository.save(variant as any);

    expect(dataSource.getRepository).toHaveBeenCalled();
    expect(ormRepository.create).toHaveBeenCalledWith(variant);
    expect(ormRepository.save).toHaveBeenCalledWith(entity);
    expect(result).toBe(saved);
  });

  it('should find variant by id with relations', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'variant-1' });

    const result = await repository.findById('variant-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      relations: ['product', 'unit', 'priceListItems'],
    });
    expect(result).toMatchObject({ id: 'variant-1' });
  });

  it('should list active variants with joins', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([{ id: 'variant-1' }]);

    const result = await repository.findAll();

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('v');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'v.priceListItems',
      'priceListItem',
      'priceListItem.deletedAt IS NULL',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'priceListItem.priceList',
      'priceList',
      'priceList.deletedAt IS NULL AND priceList.isActive = true',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('v.product', 'product');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.category', 'category');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('v.unit', 'unit');
    expect(queryBuilder.where).toHaveBeenCalledWith('v.deletedAt IS NULL');
    expect(result).toEqual([{ id: 'variant-1' }]);
  });

  it('should filter variants by product id', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await repository.findAll({ productId: 'product-1' });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('v.productId = :productId', {
      productId: 'product-1',
    });
  });
});