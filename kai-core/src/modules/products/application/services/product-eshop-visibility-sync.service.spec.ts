import { ProductEshopVisibilitySyncService } from './product-eshop-visibility-sync.service';

describe('ProductEshopVisibilitySyncService', () => {
  const productRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const variantRepo = {
    createQueryBuilder: jest.fn(),
  };

  let service: ProductEshopVisibilitySyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductEshopVisibilitySyncService(
      productRepo as any,
      variantRepo as any,
    );
  });

  it('enableAllVariantsWhenProductVisible updates non-deleted siblings', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 3 });
    const andWhere = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ andWhere });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    variantRepo.createQueryBuilder.mockReturnValue({ update });

    Object.assign(variantRepo.createQueryBuilder(), {
      update,
    });
    update.mockReturnValue({ set });
    set.mockReturnValue({ where });
    where.mockReturnValue({ andWhere });

    const count = await service.enableAllVariantsWhenProductVisible('prod-1');
    expect(count).toBe(3);
    expect(set).toHaveBeenCalledWith({ visibleInEShop: true });
    expect(where).toHaveBeenCalledWith('productId = :productId', { productId: 'prod-1' });
  });

  it('syncProductVisibilityFromVariants hides product when no visible variants remain', async () => {
    productRepo.findOne.mockResolvedValue({
      id: 'prod-1',
      visibleInEShop: true,
    });
    const getCount = jest.fn().mockResolvedValue(0);
    const andWhereVisible = jest.fn().mockReturnValue({ getCount });
    const andWhereDeleted = jest.fn().mockReturnValue({ andWhere: andWhereVisible });
    const where = jest.fn().mockReturnValue({ andWhere: andWhereDeleted });
    variantRepo.createQueryBuilder.mockReturnValue({ where });

    const changed = await service.syncProductVisibilityFromVariants('prod-1');

    expect(changed).toBe(true);
    expect(productRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ visibleInEShop: false }),
    );
  });

  it('syncProductVisibilityFromVariants keeps product visible when a variant is visible', async () => {
    productRepo.findOne.mockResolvedValue({
      id: 'prod-1',
      visibleInEShop: true,
    });
    const getCount = jest.fn().mockResolvedValue(2);
    const andWhereVisible = jest.fn().mockReturnValue({ getCount });
    const andWhereDeleted = jest.fn().mockReturnValue({ andWhere: andWhereVisible });
    const where = jest.fn().mockReturnValue({ andWhere: andWhereDeleted });
    variantRepo.createQueryBuilder.mockReturnValue({ where });

    const changed = await service.syncProductVisibilityFromVariants('prod-1');

    expect(changed).toBe(false);
    expect(productRepo.save).not.toHaveBeenCalled();
  });
});
