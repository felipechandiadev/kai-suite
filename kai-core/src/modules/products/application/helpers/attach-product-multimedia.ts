import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { resolvePrimaryMultimediaPublicUrl } from '@modules/multimedia/application/utils/resolve-primary-multimedia.util';

export type ProductMediaRow = {
  id: string;
  primaryImageUrl?: string | null;
  mediaAssets?: Array<{
    id: string;
    publicUrl: string;
    mimeType: string;
    kind: string;
    isPrimary?: boolean;
  }>;
};

/**
 * Enriquece productos del listado con multimedia enlazada a entidad `product`.
 */
export async function attachProductMultimedia<T extends ProductMediaRow>(
  multimediaService: MultimediaServiceAdapter,
  products: T[],
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) {
    return;
  }
  const mediaByProductId = await multimediaService.listByEntityIds(
    'product',
    productIds,
    undefined,
  );

  for (const product of products) {
    const assets = mediaByProductId[product.id] ?? [];
    product.primaryImageUrl = resolvePrimaryMultimediaPublicUrl(assets);
    product.mediaAssets = assets.map((a) => ({
      id: a.id,
      publicUrl: a.publicUrl,
      mimeType: a.mimeType,
      kind: a.kind,
      isPrimary: (a as { isPrimary?: boolean }).isPrimary === true,
    }));
  }
}
