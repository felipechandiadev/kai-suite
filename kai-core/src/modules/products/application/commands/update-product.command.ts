import { BaseCommand } from '@shared/cqrs';
import { ProductType } from '../../domain/product.entity';

export class UpdateProductCommand extends BaseCommand {
  constructor(
    public readonly productId: string,
    public readonly currentUserId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly brand?: string,
    public readonly categoryId?: string,
    public readonly isActive?: boolean,
    public readonly visibleInEShop?: boolean,
    public readonly productType?: ProductType,
    /** `null` limpia la marca; `undefined` no modifica. */
    public readonly brandId?: string | null,
  ) {
    super();
  }
}
