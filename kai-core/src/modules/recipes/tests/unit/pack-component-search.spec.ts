import { ProductType } from '@modules/products/domain/product.entity';
import { PACK_COMPONENT_TYPES } from '@modules/products/application/helpers/product-type-policy.util';
import { PackService } from '../../application/pack.service';

describe('PackService.searchComponents', () => {
  function makeQueryBuilder() {
    const qb: {
      leftJoinAndSelect: jest.Mock;
      where: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      addOrderBy: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getManyAndCount: jest.Mock;
    } = {} as never;
    const chain = jest.fn().mockReturnValue(qb);
    qb.leftJoinAndSelect = chain;
    qb.where = chain;
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.orderBy = chain;
    qb.addOrderBy = chain;
    qb.skip = chain;
    qb.take = chain;
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    return qb;
  }

  it('restricts results to PHYSICAL, ELABORADO and MANUFACTURADO and excludes the pack variant', async () => {
    const qb = makeQueryBuilder();
    const variantRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      manager: { connection: { options: { type: 'postgres' } } },
    };
    const service = new PackService(
      {} as never,
      {} as never,
      variantRepo as never,
      {} as never,
    );

    await service.searchComponents('company-1', {
      q: 'galletas',
      excludeVariantId: 'pack-variant-id',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'product.productType IN (:...packComponentTypes)',
      {
        packComponentTypes: [
          ProductType.PHYSICAL,
          ProductType.ELABORADO,
          ProductType.MANUFACTURADO,
        ],
      },
    );
    expect(PACK_COMPONENT_TYPES).not.toContain(ProductType.INSUMO);
    expect(PACK_COMPONENT_TYPES).not.toContain(ProductType.PACK);
    expect(PACK_COMPONENT_TYPES).not.toContain(ProductType.AGREGADO);
    expect(PACK_COMPONENT_TYPES).not.toContain(ProductType.PREPARADO);
    expect(qb.andWhere).toHaveBeenCalledWith('v.id != :excludeVariantId', {
      excludeVariantId: 'pack-variant-id',
    });
  });
});
