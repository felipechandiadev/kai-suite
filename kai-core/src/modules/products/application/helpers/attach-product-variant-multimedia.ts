import { toSlimMultimediaProjection } from '@modules/multimedia/application/utils/resolve-multimedia-urls.util';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

/**
 * Enriquece cada variante con multimedia por atributo (`product-variant` + `attributeId`).
 * No hay galería general en variantes.
 */
export async function attachProductVariantMultimedia(
  multimediaService: MultimediaServiceAdapter,
  variantsByProduct: Record<string, Array<Record<string, unknown>>>,
  variantIds: string[],
): Promise<void> {
  if (variantIds.length === 0) {
    return;
  }
  const mediaByVariantId = await multimediaService.listByEntityIds(
    'product-variant',
    variantIds,
    undefined,
    'all',
  );

  for (const pid of Object.keys(variantsByProduct)) {
    variantsByProduct[pid] = variantsByProduct[pid].map((row) => {
      const id = row.id != null ? String(row.id) : '';
      const assets = id ? mediaByVariantId[id] ?? [] : [];
      return {
        ...row,
        primaryImageUrl: null,
        mediaAssets: assets.map((a) => toSlimMultimediaProjection(a)),
      };
    });
  }
}
