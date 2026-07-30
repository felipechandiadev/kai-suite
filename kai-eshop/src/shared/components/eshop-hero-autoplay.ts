const DEFAULT_AUTOPLAY_SECONDS = 6;
const MIN_AUTOPLAY_SECONDS = 3;

export function resolveHeroAutoplayMs(autoplaySeconds: number): number {
  const seconds = Math.max(
    MIN_AUTOPLAY_SECONDS,
    Math.round(autoplaySeconds) || DEFAULT_AUTOPLAY_SECONDS,
  );
  return seconds * 1000;
}
