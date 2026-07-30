import { Product } from '@modules/products/domain/product.entity';

export interface ProductsRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(filter?: Record<string, any>): Promise<Product[]>;
  remove(id: string): Promise<void>;
}

export const PRODUCTS_REPOSITORY = 'PRODUCTS_REPOSITORY';
