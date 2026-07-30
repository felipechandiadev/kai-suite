import { IQuery } from '@nestjs/cqrs';

export class GetAllStoragesQuery implements IQuery {
  constructor(
    public readonly includeInactive: boolean = false,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class GetStorageByIdQuery implements IQuery {
  constructor(public readonly id: string) {}
}
