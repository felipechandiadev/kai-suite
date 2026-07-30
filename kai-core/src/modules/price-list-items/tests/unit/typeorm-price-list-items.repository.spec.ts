import { TypeOrmPriceListItemsRepository } from '@modules/price-list-items/infrastructure/repositories/typeorm-price-list-items.repository';

describe('TypeOrmPriceListItemsRepository', () => {
  let repository: TypeOrmPriceListItemsRepository;
  let ormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let dataSource: {
    getRepository: jest.Mock;
  };

  const item = {
    id: 'item-1',
    priceListId: 'pl-1',
    productId: 'product-1',
    productVariantId: 'variant-1',
    netPrice: 100,
    grossPrice: 119,
    taxIds: ['tax-1'],
    minPrice: 90,
    maxDiscountPercent: 10,
  };

  beforeEach(() => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(ormRepository),
    };

    repository = new TypeOrmPriceListItemsRepository(dataSource as any);
  });

  it('should create and save an item', async () => {
    ormRepository.create.mockReturnValueOnce(item);
    ormRepository.save.mockResolvedValueOnce(item);

    const result = await repository.save(item as any);

    expect(dataSource.getRepository).toHaveBeenCalledTimes(1);
    expect(ormRepository.create).toHaveBeenCalledWith(item);
    expect(ormRepository.save).toHaveBeenCalledWith(item);
    expect(result).toEqual(item);
  });

  it('should find items by variant id with priceList relation', async () => {
    ormRepository.find.mockResolvedValueOnce([item]);

    const result = await repository.findByVariantId('variant-1');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { productVariantId: 'variant-1' },
      relations: ['priceList'],
    });
    expect(result).toEqual([item]);
  });

  it('should delete items by variant id', async () => {
    ormRepository.delete.mockResolvedValueOnce(undefined);

    await repository.deleteByVariantId('variant-1');

    expect(ormRepository.delete).toHaveBeenCalledWith({ productVariantId: 'variant-1' });
  });
});