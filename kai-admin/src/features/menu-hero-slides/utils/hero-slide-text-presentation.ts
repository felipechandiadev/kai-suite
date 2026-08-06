import type { CSSProperties } from "react";

type Rgb = { r: number; g: number; b: number };

const THEME_DEFAULT_TEXT_SHADOW =
  "0 1px 2px rgba(255, 255, 255, 0.95), 0 2px 14px rgba(255, 255, 255, 0.8), 0 1px 5px rgba(0, 0, 0, 0.14)";

function normalizeHeroSlideHexColor(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const raw = String(value).trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const h = hex.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  return null;
}

function parseHexColor(hex: string): Rgb | null {
  const normalized = normalizeHeroSlideHexColor(hex);
  if (!normalized) return null;
  const h = normalized.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function srgbChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function heroSlideRelativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  const r = srgbChannel(rgb.r);
  const g = srgbChannel(rgb.g);
  const b = srgbChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function heroSlideTextShadowForHex(hex: string): string {
  const isLightText = heroSlideRelativeLuminance(hex) > 0.55;
  if (isLightText) {
    return "0 2px 16px rgba(0, 0, 0, 0.72), 0 1px 4px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.35)";
  }
  return "0 1px 2px rgba(255, 255, 255, 0.95), 0 2px 14px rgba(255, 255, 255, 0.78), 0 1px 5px rgba(0, 0, 0, 0.16)";
}

function heroSlideIndicatorBoxShadowForHex(hex: string): string {
  const isLightText = heroSlideRelativeLuminance(hex) > 0.55;
  if (isLightText) {
    return "0 2px 8px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3)";
  }
  return "0 2px 8px rgba(255, 255, 255, 0.55), 0 1px 3px rgba(0, 0, 0, 0.2)";
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function heroSlideOverlayChipStyle(hex: string): CSSProperties {
  const textShadow = heroSlideTextShadowForHex(hex);
  const boxShadow = heroSlideIndicatorBoxShadowForHex(hex);
  return {
    color: hex,
    textShadow,
    boxShadow,
    borderColor: hexToRgba(hex, 0.4),
    backgroundColor: hexToRgba(hex, 0.14),
  };
}

export type HeroSlideTextPresentation = {
  usesCustomColor: boolean;
  textColor: string | null;
  textShadow: string;
  titleStyle: CSSProperties | undefined;
  subtitleStyle: CSSProperties | undefined;
  linkStyle: CSSProperties | undefined;
  statusBadgeStyle: CSSProperties | undefined;
  dragHandleStyle: CSSProperties | undefined;
};

export function getHeroSlideTextPresentation(
  textColor: string | null | undefined,
): HeroSlideTextPresentation {
  const hex = normalizeHeroSlideHexColor(textColor);

  if (!hex) {
    return {
      usesCustomColor: false,
      textColor: null,
      textShadow: THEME_DEFAULT_TEXT_SHADOW,
      titleStyle: undefined,
      subtitleStyle: undefined,
      linkStyle: undefined,
      statusBadgeStyle: undefined,
      dragHandleStyle: undefined,
    };
  }

  const textShadow = heroSlideTextShadowForHex(hex);
  const chipStyle = heroSlideOverlayChipStyle(hex);

  return {
    usesCustomColor: true,
    textColor: hex,
    textShadow,
    titleStyle: { color: hex, textShadow },
    subtitleStyle: { color: hex, opacity: 0.88, textShadow },
    linkStyle: { color: hex, textShadow },
    statusBadgeStyle: chipStyle,
    dragHandleStyle: chipStyle,
  };
}

export function heroSlideUsesCustomTextColor(textColor: string | null | undefined): boolean {
  return getHeroSlideTextPresentation(textColor).usesCustomColor;
}

export function heroSlideTitleStyle(textColor: string | null | undefined): CSSProperties | undefined {
  return getHeroSlideTextPresentation(textColor).titleStyle;
}

export function heroSlideSubtitleStyle(textColor: string | null | undefined): CSSProperties | undefined {
  return getHeroSlideTextPresentation(textColor).subtitleStyle;
}

export function heroSlideLinkCtaStyle(textColor: string | null | undefined): CSSProperties | undefined {
  return getHeroSlideTextPresentation(textColor).linkStyle;
}
