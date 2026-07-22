import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType } from '@modules/products/domain/product.entity';

export type KaiProduct = 'kaistore' | 'kaifood' | 'kaiservices' | 'kaisuite';

export const FOOD_ONLY_PRODUCT_TYPES: readonly ProductType[] = [
  ProductType.PREPARADO,
];

@Injectable()
export class ProductModeService {
  constructor(private readonly configService: ConfigService) {}

  getProductMode(): KaiProduct {
    return this.configService.get<KaiProduct>('KAI_PRODUCT', 'kaistore')!;
  }

  /** KaiFood o Kai Suite (suite incluye gastronomía). */
  isKaiFood(): boolean {
    const mode = this.getProductMode();
    return mode === 'kaifood' || mode === 'kaisuite';
  }

  assertProductTypeAllowed(productType: ProductType): void {
    if (
      (FOOD_ONLY_PRODUCT_TYPES as ProductType[]).includes(productType) &&
      !this.isKaiFood()
    ) {
      throw new BadRequestException(
        `El tipo de producto ${productType} solo está disponible en KaiFood o Kai Suite.`,
      );
    }
  }
}
