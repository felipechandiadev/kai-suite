export const HERO_SLIDE_TEXT_COLOR_PRESETS: { label: string; value: string | null }[] = [
  { label: "Por defecto", value: null },
  { label: "Blanco", value: "#FFFFFF" },
  { label: "Negro", value: "#111827" },
];

export function normalizeHeroSlideTextColor(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;
  const raw = value.trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const h = hex.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  return null;
}

export function colorInputValueFromHeroTextColor(textColor: string | null): string {
  return textColor ?? "#FFFFFF";
}
