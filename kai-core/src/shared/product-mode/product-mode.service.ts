import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType } from '@modules/products/domain/product.entity';

export type KaiProduct = 'kaistore' | 'kaifood' | 'kaiservices' | 'kaisuite';
export type CompanyKaiProduct = 'kaistore' | 'kaifood' | 'kaiservices';

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

  /** Vertical efectivo de una empresa (no incluye `kaisuite`). */
  isKaiFoodCompany(kaiProduct: string | null | undefined): boolean {
    return (kaiProduct ?? '').trim().toLowerCase() === 'kaifood';
  }

  isKaiStoreCompany(kaiProduct: string | null | undefined): boolean {
    const v = (kaiProduct ?? '').trim().toLowerCase();
    return v === '' || v === 'kaistore';
  }

  isKaiServicesCompany(kaiProduct: string | null | undefined): boolean {
    return (kaiProduct ?? '').trim().toLowerCase() === 'kaiservices';
  }

  /** Lavandería (recepción, catálogo de prendas): solo vertical Kai Services. */
  isKaiServices(): boolean {
    return this.getProductMode() === 'kaiservices';
  }

  /**
   * Valida el vertical de una empresa contra el modo de deploy.
   * `kaisuite` admite kaistore | kaifood | kaiservices.
   */
  assertCompanyProductAllowed(
    companyProduct: 'kaistore' | 'kaifood' | 'kaiservices',
  ): void {
    const deploy = this.getProductMode();
    if (deploy === 'kaisuite') {
      return;
    }
    if (deploy !== companyProduct) {
      throw new BadRequestException(
        `Esta instancia es ${deploy}; no se puede asignar el producto ${companyProduct} a la empresa.`,
      );
    }
  }

  /** Default de kaiProduct al crear empresa según el deploy. */
  defaultCompanyProduct(): 'kaistore' | 'kaifood' | 'kaiservices' {
    const deploy = this.getProductMode();
    if (deploy === 'kaisuite') return 'kaistore';
    return deploy;
  }

  /**
   * Tipos de salida permitidos en lotes PRODUCTION_BATCH según vertical de empresa.
   * KaiFood → ELABORADO; KaiStore (u vacío) → MANUFACTURADO.
   */
  batchProductionOutputTypes(
    kaiProduct: string | null | undefined,
  ): ProductType[] {
    if (this.isKaiFoodCompany(kaiProduct)) {
      return [ProductType.ELABORADO];
    }
    return [ProductType.MANUFACTURADO];
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

  /**
   * Valida tipo de producto contra el vertical de la empresa activa
   * y el techo del deploy (`KAI_PRODUCT`).
   */
  assertProductTypeAllowedForCompany(
    productType: ProductType,
    companyProduct: CompanyKaiProduct,
  ): void {
    this.assertCompanyProductAllowed(companyProduct);
    if (
      (FOOD_ONLY_PRODUCT_TYPES as ProductType[]).includes(productType) &&
      !this.isKaiFoodCompany(companyProduct)
    ) {
      throw new BadRequestException(
        `El tipo de producto ${productType} solo está disponible en empresas KaiFood.`,
      );
    }
    this.assertProductTypeAllowed(productType);
  }
}
