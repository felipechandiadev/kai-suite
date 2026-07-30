import type { MultimediaVariant } from '../../domain/multimedia-variant.entity';
import type { MultimediaAsset } from '../../domain/multimedia-asset.entity';

export type MultimediaVariantDto = {
  variantType: string;
  format: string;
  width: number;
  height: number;
  publicUrl: string;
  size: number;
};

export type MultimediaAssetApiView = MultimediaAsset & {
  thumbnailUrl?: string | null;
  variants?: MultimediaVariantDto[];
  isPrimary?: boolean;
  sortOrder?: number;
  linkId?: string;
};

function preferFormat(
  variants: readonly MultimediaVariant[],
  variantType: string,
  formats: string[],
): MultimediaVariant | undefined {
  for (const format of formats) {
    const hit = variants.find(
      (v) => v.variantType === variantType && v.format === format,
    );
    if (hit) return hit;
  }
  return variants.find((v) => v.variantType === variantType);
}

/** Display URL: prefer full/hero/avatar/logo WebP, else asset.publicUrl. */
export function resolveDisplayPublicUrl(
  asset: Pick<MultimediaAsset, 'publicUrl'> & {
    variants?: MultimediaVariant[] | null;
  },
  displayVariantType?: string,
): string {
  const variants = asset.variants ?? [];
  if (displayVariantType) {
    const hit = preferFormat(variants, displayVariantType, ['webp', 'jpeg', 'png']);
    if (hit) return hit.publicUrl;
  }
  for (const type of ['full', 'hero_desktop', 'avatar_md', 'logo', 'thumb']) {
    const hit = preferFormat(variants, type, ['webp', 'jpeg', 'png']);
    if (hit) return hit.publicUrl;
  }
  return asset.publicUrl;
}

export function resolveThumbnailPublicUrl(
  asset: Pick<MultimediaAsset, 'publicUrl'> & {
    variants?: MultimediaVariant[] | null;
  },
  thumbnailVariantType?: string,
): string {
  const variants = asset.variants ?? [];
  const preferred = thumbnailVariantType ?? 'thumb';
  const hit =
    preferFormat(variants, preferred, ['webp', 'jpeg', 'png']) ??
    preferFormat(variants, 'thumb', ['webp', 'jpeg', 'png']) ??
    preferFormat(variants, 'avatar_md', ['webp', 'jpeg', 'png']) ??
    preferFormat(variants, 'logo', ['webp', 'jpeg', 'png']);
  return hit?.publicUrl ?? asset.publicUrl;
}

export function toMultimediaVariantDtos(
  variants: readonly MultimediaVariant[] | null | undefined,
): MultimediaVariantDto[] {
  if (!variants?.length) return [];
  return variants.map((v) => ({
    variantType: v.variantType,
    format: v.format,
    width: v.width,
    height: v.height,
    publicUrl: v.publicUrl,
    size: Number(v.size),
  }));
}

export function enrichMultimediaAssetForApi<
  T extends MultimediaAsset & {
    variants?: MultimediaVariant[] | null;
    isPrimary?: boolean;
    sortOrder?: number;
    linkId?: string;
  },
>(asset: T): MultimediaAssetApiView {
  const variants = asset.variants ?? [];
  return Object.assign(asset, {
    thumbnailUrl: resolveThumbnailPublicUrl(asset),
    variants: toMultimediaVariantDtos(variants),
  });
}

/** Slim projection used by product/category handlers. */
export function toSlimMultimediaProjection(
  asset: MultimediaAsset & { variants?: MultimediaVariant[] | null; isPrimary?: boolean },
): {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  isPrimary?: boolean;
  thumbnailUrl: string;
} {
  return {
    id: asset.id,
    publicUrl: asset.publicUrl,
    mimeType: asset.mimeType,
    kind: asset.kind,
    isPrimary: asset.isPrimary,
    thumbnailUrl: resolveThumbnailPublicUrl(asset),
  };
}
