import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { UnitsServiceAdapter } from '@modules/units/application/units.service.adapter';
import { GetAllUnitsQuery } from '@modules/units/application/queries/get-all-units.query';
import { GetUnitByIdQuery } from '@modules/units/application/queries/get-unit-by-id.query';

describe('UnitsServiceAdapter', () => {
  let service: UnitsServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(UnitsServiceAdapter);
  });

  it('should dispatch GetAllUnitsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getAllUnits('active');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllUnitsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ status: 'active' });
  });

  it('should dispatch GetUnitByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getUnitById('unit-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetUnitByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ unitId: 'unit-1' });
  });
});