import { TenantContext } from '@common/tenant/tenant.context';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetAllUnitsQueryHandler } from '@modules/units/application/handlers/queries/get-all-units.handler';
import { GetAllUnitsQuery } from '@modules/units/application/queries/get-all-units.query';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

const COMPANY_ID = 'company-1';
/** Las unidades son por empresa: el handler exige empresa activa (TenantContext). */
const asCompany = <T>(fn: () => Promise<T>): Promise<T> =>
  TenantContext.run(
    { userId: 'user-1', activeCompanyId: COMPANY_ID, rol: 'ADMIN' },
    fn,
  );

describe('GetAllUnitsQueryHandler', () => {
  let handler: GetAllUnitsQueryHandler;
  let repository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllUnitsQueryHandler,
        {
          provide: getRepositoryToken(UnitOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAllUnitsQueryHandler);
  });

  it('should fetch active units and map them to domain', async () => {
    const now = new Date();
    queryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'unit-1',
        name: 'Kilogram',
        symbol: 'kg',
        dimension: UnitDimension.MASS,
        conversionFactor: 1,
        allowDecimals: true,
        isBase: true,
        baseUnitId: null,
        active: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
      },
    ]);

    const result = await asCompany(() =>
      handler.execute(new GetAllUnitsQuery('active')),
    );

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('unit');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'unit.active = :active',
      {
        active: true,
      },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('unit.symbol', 'ASC');
    expect(result[0]).toMatchObject({
      id: 'unit-1',
      name: 'Kilogram',
      symbol: 'kg',
      dimension: UnitDimension.MASS,
      active: true,
    });
  });

  it('should fetch inactive units when requested', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await asCompany(() => handler.execute(new GetAllUnitsQuery('inactive')));

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'unit.active = :active',
      {
        active: false,
      },
    );
  });
});
