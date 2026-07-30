import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetUnitByIdQueryHandler } from '@modules/units/application/handlers/queries/get-unit-by-id.handler';
import { GetUnitByIdQuery } from '@modules/units/application/queries/get-unit-by-id.query';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

describe('GetUnitByIdQueryHandler', () => {
  let handler: GetUnitByIdQueryHandler;
  let repository: { findOne: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUnitByIdQueryHandler,
        {
          provide: getRepositoryToken(UnitOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetUnitByIdQueryHandler);
  });

  it('should return a mapped unit when found', async () => {
    const now = new Date();
    repository.findOne.mockResolvedValueOnce({
      id: 'unit-1',
      name: 'Liter',
      symbol: 'L',
      dimension: UnitDimension.VOLUME,
      conversionFactor: 1,
      allowDecimals: true,
      isBase: true,
      baseUnitId: null,
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    });

    const result = await handler.execute(new GetUnitByIdQuery('unit-1'));

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
    });
    expect(result).toMatchObject({
      id: 'unit-1',
      name: 'Liter',
      symbol: 'L',
      dimension: UnitDimension.VOLUME,
    });
  });

  it('should return null when unit is missing', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    const result = await handler.execute(new GetUnitByIdQuery('missing'));

    expect(result).toBeNull();
  });
});