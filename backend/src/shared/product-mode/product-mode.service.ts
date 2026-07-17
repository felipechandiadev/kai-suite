import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType } from '@modules/products/domain/product.entity';

export type KaiProduct = 'kaistore' | 'kaifood' | 'kaiservices';

export const FOOD_ONLY_PRODUCT_TYPES: readonly ProductType[] = [
  ProductType.PREPARADO,
];

@Injectable()
export class ProductModeService {
  constructor(private readonly configService: ConfigService) {}

  getProductMode(): KaiProduct {
    return this.configService.get<KaiProduct>('KAI_PRODUCT', 'kaistore')!;
  }

  isKaiFood(): boolean {
    return this.getProductMode() === 'kaifood';
  }

  assertProductTypeAllowed(productType: ProductType): void {
    if (
      (FOOD_ONLY_PRODUCT_TYPES as ProductType[]).includes(productType) &&
      !this.isKaiFood()
    ) {
      throw new BadRequestException(
        `El tipo de producto ${productType} solo está disponible en KaiFood.`,
      );
    }
  }
}
