import { TypeOrmPriceListRepository } from '@modules/price-lists/infrastructure/repositories/type-orm-price-list.repository';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';

describe('TypeOrmPriceListRepository', () => {
  let repository: TypeOrmPriceListRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    repository = new TypeOrmPriceListRepository(ormRepository as any);
  });

  it('should save a price list', async () => {
    const priceList = { id: 'pl-1' } as PriceList;
    ormRepository.save.mockResolvedValueOnce(priceList);

    const result = await repository.save(priceList);

    expect(ormRepository.save).toHaveBeenCalledWith(priceList);
    expect(result).toBe(priceList);
  });

  it('should find a price list by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'pl-1' });

    const result = await repository.findById('pl-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'pl-1' } });
    expect(result).toMatchObject({ id: 'pl-1' });
  });

  it('should filter active price lists by default', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('priceList');
    expect(queryBuilder.where).toHaveBeenCalledWith('priceList.isActive = :isActive', {
      isActive: true,
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('priceList.priority', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('priceList.name', 'ASC');
  });

  it('should include inactive price lists when requested', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await repository.findAll(true);

    expect(queryBuilder.where).not.toHaveBeenCalled();
  });

  it('should update and reload a price list', async () => {
    const now = new Date();
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce({
      id: 'pl-1',
      name: 'Retail',
      priceListType: PriceListType.RETAIL,
      currency: 'CLP',
      priority: 1,
      isDefault: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await repository.update('pl-1', { name: 'Retail' });

    expect(ormRepository.update).toHaveBeenCalledWith('pl-1', { name: 'Retail' });
    expect(result).toMatchObject({ id: 'pl-1', name: 'Retail' });
  });

  it('should throw when updated price list cannot be reloaded', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.update('missing', { name: 'Retail' })).rejects.toThrow(
      'PriceList with id missing not found after update',
    );
  });

  it('should soft delete a price list', async () => {
    ormRepository.softDelete.mockResolvedValueOnce(undefined);

    await repository.delete('pl-1');

    expect(ormRepository.softDelete).toHaveBeenCalledWith('pl-1');
  });
});