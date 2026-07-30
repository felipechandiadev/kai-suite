import type { ImageOptimizationStrategy } from './image-optimization.strategy';

export const ProductImageStrategy: ImageOptimizationStrategy = {
  name: 'product',
  displayVariantType: 'full',
  thumbnailVariantType: 'thumb',
  variants: [
    {
      variantType: 'thumb',
      width: 640,
      height: 480,
      fit: 'cover',
      formats: [
        { format: 'webp', quality: 80 },
        { format: 'jpeg', quality: 85 },
      ],
    },
    {
      variantType: 'full',
      width: 1280,
      height: 720,
      fit: 'inside',
      withoutEnlargement: true,
      formats: [
        { format: 'webp', quality: 80 },
        { format: 'jpeg', quality: 85 },
      ],
    },
  ],
};

export const HeroImageStrategy: ImageOptimizationStrategy = {
  name: 'hero',
  displayVariantType: 'hero_desktop',
  thumbnailVariantType: 'thumb',
  variants: [
    {
      variantType: 'thumb',
      width: 400,
      height: 225,
      fit: 'cover',
      formats: [
        { format: 'webp', quality: 80 },
        { format: 'jpeg', quality: 85 },
      ],
    },
    {
      variantType: 'hero_desktop',
      width: 1920,
      height: 1080,
      fit: 'cover',
      formats: [
        { format: 'webp', quality: 80 },
        { format: 'jpeg', quality: 85 },
      ],
    },
  ],
};

export const AvatarImageStrategy: ImageOptimizationStrategy = {
  name: 'avatar',
  displayVariantType: 'avatar_md',
  thumbnailVariantType: 'avatar_md',
  variants: [
    {
      variantType: 'avatar_md',
      width: 160,
      height: 160,
      fit: 'cover',
      formats: [
        { format: 'webp', quality: 90 },
        { format: 'jpeg', quality: 95 },
      ],
    },
  ],
};

export const LogoImageStrategy: ImageOptimizationStrategy = {
  name: 'logo',
  displayVariantType: 'logo',
  thumbnailVariantType: 'logo',
  variants: [
    {
      variantType: 'logo',
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
      formats: [
        { format: 'webp', quality: 90 },
        { format: 'png', quality: 90 },
      ],
    },
  ],
};
