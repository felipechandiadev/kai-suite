import { BaseCommand } from '@shared/cqrs';
import { ProductType } from '../../domain/product.entity';

export class CreateProductCommand extends BaseCommand {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly categoryId?: string,
    public readonly brand?: string,
    public readonly description?: string,
    public readonly isActive: boolean = true,
    public readonly visibleInEShop: boolean = false,
    public readonly onMenu: boolean = false,
    public readonly productType?: ProductType,
    /** FK opcional a `brands`; si viene, el handler denormaliza `brand` con el nombre de la marca. */
    public readonly brandId?: string | null,
  ) {
    super();
  }
}
