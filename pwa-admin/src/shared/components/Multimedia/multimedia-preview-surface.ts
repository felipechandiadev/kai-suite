import type { CSSProperties } from "react";

/** Gray-200 — darker than neutral-50 for PNG logo contrast. */
export const MULTIMEDIA_PREVIEW_CONTRAST_BACKGROUND = "#e5e7eb";

export type PreviewSurface = {
  style?: CSSProperties;
  omitDefaultBg: boolean;
};

export function resolvePreviewSurface(color?: string): PreviewSurface {
  const trimmed = color?.trim();
  if (!trimmed) {
    return { omitDefaultBg: false };
  }
  return {
    style: { backgroundColor: trimmed },
    omitDefaultBg: true,
  };
}
