import {
  resolveDisplayPublicUrl,
  resolveThumbnailPublicUrl,
  toSlimMultimediaProjection,
} from '../../application/utils/resolve-multimedia-urls.util';
import type { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import type { MultimediaVariant } from '../../domain/multimedia-variant.entity';

function variant(
  partial: Partial<MultimediaVariant> &
    Pick<MultimediaVariant, 'variantType' | 'format' | 'publicUrl'>,
): MultimediaVariant {
  return {
    id: 'v1',
    assetId: 'a1',
    width: 100,
    height: 100,
    size: 1000,
    storageKey: 'k',
    createdAt: new Date(),
    ...partial,
  } as MultimediaVariant;
}

describe('resolve-multimedia-urls', () => {
  const asset = {
    id: 'a1',
    publicUrl: '/multimedia/files/original.jpg',
    mimeType: 'image/jpeg',
    kind: 'image',
    variants: [
      variant({
        variantType: 'thumb',
        format: 'webp',
        publicUrl: '/multimedia/files/thumb.webp',
      }),
      variant({
        variantType: 'full',
        format: 'webp',
        publicUrl: '/multimedia/files/full.webp',
      }),
      variant({
        variantType: 'full',
        format: 'jpeg',
        publicUrl: '/multimedia/files/full.jpg',
      }),
    ],
  } as MultimediaAsset;

  it('prefers full webp for display', () => {
    expect(resolveDisplayPublicUrl(asset, 'full')).toBe(
      '/multimedia/files/full.webp',
    );
  });

  it('prefers thumb webp for thumbnail', () => {
    expect(resolveThumbnailPublicUrl(asset, 'thumb')).toBe(
      '/multimedia/files/thumb.webp',
    );
  });

  it('falls back to publicUrl when no variants', () => {
    expect(
      resolveThumbnailPublicUrl({
        publicUrl: '/x',
        variants: [],
      }),
    ).toBe('/x');
  });

  it('slim projection includes thumbnailUrl', () => {
    const slim = toSlimMultimediaProjection(asset);
    expect(slim.thumbnailUrl).toBe('/multimedia/files/thumb.webp');
    expect(slim.publicUrl).toBe('/multimedia/files/original.jpg');
  });
});
