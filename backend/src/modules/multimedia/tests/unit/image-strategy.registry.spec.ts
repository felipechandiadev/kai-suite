import { ImageStrategyRegistry } from '../../application/media-optimization/image-strategy.registry';
import {
  AvatarImageStrategy,
  HeroImageStrategy,
  LogoImageStrategy,
  ProductImageStrategy,
} from '../../application/media-optimization/strategies';

describe('ImageStrategyRegistry', () => {
  const registry = new ImageStrategyRegistry();

  it('maps product entities to product strategy', () => {
    expect(registry.resolve('product')?.name).toBe(ProductImageStrategy.name);
    expect(registry.resolve('product-variant')?.name).toBe(ProductImageStrategy.name);
  });

  it('maps hero and avatar entities', () => {
    expect(registry.resolve('e-shop-hero-slide')?.name).toBe(HeroImageStrategy.name);
    expect(registry.resolve('e-shop-testimonial')?.name).toBe(AvatarImageStrategy.name);
    expect(registry.resolve('employee')?.name).toBe(AvatarImageStrategy.name);
  });

  it('maps company to logo strategy', () => {
    expect(registry.resolve('company')?.name).toBe(LogoImageStrategy.name);
  });

  it('returns null for unknown or empty', () => {
    expect(registry.resolve(undefined)).toBeNull();
    expect(registry.resolve('operational-expense')).toBeNull();
  });
});
