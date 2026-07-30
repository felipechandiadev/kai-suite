import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllUnitsQuery } from './queries/get-all-units.query';
import { GetUnitByIdQuery } from './queries/get-unit-by-id.query';

@Injectable()
export class UnitsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getAllUnits(status?: string) {
    return this.queryBus.execute(new GetAllUnitsQuery(status));
  }

  async getUnitById(unitId: string) {
    return this.queryBus.execute(new GetUnitByIdQuery(unitId));
  }
}