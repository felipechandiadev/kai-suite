import { BaseCommand } from '@shared/cqrs';

export interface AdjustStockCommandResult {
  success: boolean;
  stockLevel: {
    id: string;
    physicalStock: number;
    availableStock: number;
  };
}

export class AdjustStockCommand extends BaseCommand {
  constructor(
    public readonly productVariantId: string,
    public readonly storageId: string,
    public readonly adjustment: number, // positivo para aumentar, negativo para disminuir
    public readonly reason: string,
  ) {
    super();
  }
}