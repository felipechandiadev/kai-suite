import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllStoragesQuery, GetStorageByIdQuery } from './queries/get-all-storages.query';

@Injectable()
export class StoragesServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getAllStorages(includeInactive: boolean = false, limit?: number, offset?: number) {
    return this.queryBus.execute(new GetAllStoragesQuery(includeInactive, limit, offset));
  }

  async getStorageById(id: string) {
    return this.queryBus.execute(new GetStorageByIdQuery(id));
  }
}