import { BaseCommand } from '@shared/cqrs';

export class RemoveSupplierCommand extends BaseCommand {
  constructor(
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
