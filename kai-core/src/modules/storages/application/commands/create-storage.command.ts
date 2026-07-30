import { ICommand } from '@nestjs/cqrs';
import { CreateStorageDto, UpdateStorageDto } from '../dto/storage.dto';

export class CreateStorageCommand implements ICommand {
  constructor(public readonly data: CreateStorageDto) {}
}

export class UpdateStorageCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly data: UpdateStorageDto,
  ) {}
}

export class DeleteStorageCommand implements ICommand {
  constructor(public readonly id: string) {}
}
