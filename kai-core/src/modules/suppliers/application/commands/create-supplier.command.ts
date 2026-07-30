import { BaseCommand } from '@shared/cqrs';
import { SupplierType } from '../../domain/supplier.entity';

export class CreateSupplierCommand extends BaseCommand {
  constructor(
    public readonly personId: string,
    public readonly supplierType: SupplierType,
    public readonly defaultPaymentTermDays: number,
    public readonly userId: string,
    public readonly alias?: string,
    public readonly notes?: string,
  ) {
    super();
  }
}
