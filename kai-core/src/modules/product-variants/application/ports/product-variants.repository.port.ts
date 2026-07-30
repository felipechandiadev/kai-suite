import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

export interface ProductVariantsRepositoryPort {
  save(variant: ProductVariant | any): Promise<ProductVariant>;
  findById(id: string): Promise<ProductVariant | null>;
  findAll(filter?: Record<string, any>): Promise<ProductVariant[]>;
  softRemove?(variant: ProductVariant | any): Promise<void> | Promise<any>;
}

export const PRODUCT_VARIANTS_REPOSITORY = 'PRODUCT_VARIANTS_REPOSITORY';
