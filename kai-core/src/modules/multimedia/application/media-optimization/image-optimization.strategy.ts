export type ImageFitMode = 'cover' | 'inside' | 'contain';

export type ImageEncodeFormat = 'webp' | 'jpeg' | 'png';

export type ImageVariantSpec = {
  variantType: string;
  width: number;
  height: number;
  fit: ImageFitMode;
  /** Do not upscale smaller sources when fit is inside. */
  withoutEnlargement?: boolean;
  formats: Array<{
    format: ImageEncodeFormat;
    quality: number;
  }>;
};

export interface ImageOptimizationStrategy {
  readonly name: string;
  /** Prefer this variantType+webp for publicUrl when present. */
  readonly displayVariantType: string;
  /** Prefer this for thumbnailUrl. */
  readonly thumbnailVariantType: string;
  variants: ImageVariantSpec[];
}
