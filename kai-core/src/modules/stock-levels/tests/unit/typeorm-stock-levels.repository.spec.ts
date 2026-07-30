import { TypeOrmStockLevelsRepository } from '@modules/stock-levels/infrastructure/repositories/typeorm-stock-levels.repository';

describe('TypeOrmStockLevelsRepository', () => {
  let repository: TypeOrmStockLevelsRepository;
  let ormRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    repository = new TypeOrmStockLevelsRepository(ormRepository as any);
  });

  it('should find stock level by variant and storage', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'sl-1' });

    const result = await repository.findByProductVariantAndStorage('variant-1', 'storage-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { productVariantId: 'variant-1', storageId: 'storage-1' },
    });
    expect(result).toMatchObject({ id: 'sl-1' });
  });

  it('should save stock level', async () => {
    const stockLevel = { id: 'sl-1', physicalStock: 10 };
    ormRepository.save.mockResolvedValueOnce(stockLevel);

    const result = await repository.save(stockLevel as any);

    expect(ormRepository.save).toHaveBeenCalledWith(stockLevel);
    expect(result).toBe(stockLevel);
  });

  it('should list all stock levels', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'sl-1' }]);

    const result = await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'sl-1' }]);
  });
});