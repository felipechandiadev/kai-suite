export type MultimediaAssetLike = {
  publicUrl: string;
  isPrimary?: boolean;
};

/** Primera imagen principal marcada; si no hay, la primera del listado (ya ordenado por repo). */
export function resolvePrimaryMultimediaAsset<T extends MultimediaAssetLike>(
  assets: readonly T[],
): T | null {
  if (assets.length === 0) {
    return null;
  }
  return assets.find((a) => a.isPrimary === true) ?? assets[0] ?? null;
}

export function resolvePrimaryMultimediaPublicUrl(
  assets: readonly MultimediaAssetLike[],
): string | null {
  return resolvePrimaryMultimediaAsset(assets)?.publicUrl ?? null;
}
