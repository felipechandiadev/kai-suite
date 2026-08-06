export const HERO_SLIDER_AUTOPLAY_MIN_SECONDS = 3;
export const HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS = 6;

export function clampHeroSliderAutoplaySeconds(value: number): number {
  return Math.max(HERO_SLIDER_AUTOPLAY_MIN_SECONDS, Math.round(value) || HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS);
}
