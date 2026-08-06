import { Injectable } from '@nestjs/common';
import type { ImageOptimizationStrategy } from './image-optimization.strategy';
import {
  AvatarImageStrategy,
  HeroImageStrategy,
  LogoImageStrategy,
  ProductImageStrategy,
} from './strategies';

const ENTITY_STRATEGY: Record<string, ImageOptimizationStrategy> = {
  product: ProductImageStrategy,
  'product-variant': ProductImageStrategy,
  category: ProductImageStrategy,
  brand: ProductImageStrategy,
  'e-shop-hero-slide': HeroImageStrategy,
  'menu-hero-slide': HeroImageStrategy,
  'e-shop-testimonial': AvatarImageStrategy,
  employee: AvatarImageStrategy,
  company: LogoImageStrategy,
};

@Injectable()
export class ImageStrategyRegistry {
  resolve(entityType: string | undefined | null): ImageOptimizationStrategy | null {
    if (!entityType?.trim()) {
      return null;
    }
    return ENTITY_STRATEGY[entityType.trim()] ?? null;
  }
}
