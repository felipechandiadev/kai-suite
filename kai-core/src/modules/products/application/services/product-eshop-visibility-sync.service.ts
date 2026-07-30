import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { isSellableProductType } from '../helpers/product-type-policy.util';

/**
 * Reglas eShop catálogo:
 * - Producto visible → todas sus variantes no eliminadas quedan visibles.
 * - Ocultar una variante no cambia el flag del producto.
 * - Si ninguna variante (no eliminada) queda visible → el producto se oculta.
 */
@Injectable()
export class ProductEshopVisibilitySyncService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async enableAllVariantsWhenProductVisible(productId: string): Promise<number> {
    const pid = productId?.trim();
    if (!pid) {
      return 0;
    }
    const result = await this.variantRepository
      .createQueryBuilder()
      .update(ProductVariant)
      .set({ visibleInEShop: true })
      .where('productId = :productId', { productId: pid })
      .andWhere('deletedAt IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async syncProductVisibilityFromVariants(productId: string): Promise<boolean> {
    const pid = productId?.trim();
    if (!pid) {
      return false;
    }

    const product = await this.productRepository.findOne({
      where: { id: pid, deletedAt: null as unknown as undefined },
    });
    if (!product) {
      return false;
    }

    const visibleVariantCount = await this.variantRepository
      .createQueryBuilder('v')
      .where('v.productId = :productId', { productId: pid })
      .andWhere('v.deletedAt IS NULL')
      .andWhere('v.visibleInEShop = true')
      .getCount();

    if (visibleVariantCount === 0 && product.visibleInEShop === true) {
      product.visibleInEShop = false;
      await this.productRepository.save(product);
      return true;
    }

    return false;
  }

  async afterProductEshopVisibilitySet(
    productId: string,
    visibleInEShop: boolean,
  ): Promise<void> {
    if (visibleInEShop !== true) {
      return;
    }
    const product = await this.productRepository.findOne({
      where: { id: productId?.trim() },
    });
    if (!product || !isSellableProductType(product.productType)) {
      return;
    }
    await this.enableAllVariantsWhenProductVisible(productId);
  }

  async afterVariantEshopVisibilityChanged(productId: string | null | undefined): Promise<void> {
    if (!productId?.trim()) {
      return;
    }
    await this.syncProductVisibilityFromVariants(productId.trim());
  }
}
