import type { PosFavoriteButtonSize } from "./pos-favorite-quickpick-storage";
import { DEFAULT_POS_FAVORITE_BUTTON_SIZE } from "./pos-favorite-quickpick-storage";

export type FavoriteButtonSizeStyles = {
  chipClass: string;
  textClass: string;
  barMaxHeightClass: string;
  gapClass: string;
};

export const FAVORITE_BUTTON_SIZE_STYLES: Record<
  PosFavoriteButtonSize,
  FavoriteButtonSizeStyles
> = {
  xs: {
    chipClass: "max-w-[9rem] px-1.5 py-1",
    textClass: "text-[10px]",
    barMaxHeightClass: "max-h-24",
    gapClass: "gap-1",
  },
  sm: {
    chipClass: "max-w-[10rem] px-2 py-1.5",
    textClass: "text-[11px]",
    barMaxHeightClass: "max-h-28",
    gapClass: "gap-1.5",
  },
  md: {
    chipClass: "max-w-[11rem] px-2 py-2",
    textClass: "text-xs",
    barMaxHeightClass: "max-h-32",
    gapClass: "gap-1.5",
  },
  lg: {
    chipClass: "max-w-[12rem] px-2.5 py-2",
    textClass: "text-[13px]",
    barMaxHeightClass: "max-h-36",
    gapClass: "gap-2",
  },
  xl: {
    chipClass: "max-w-[14rem] px-3 py-2.5",
    textClass: "text-sm",
    barMaxHeightClass: "max-h-40",
    gapClass: "gap-2",
  },
};

export function getFavoriteButtonSizeStyles(
  size: PosFavoriteButtonSize,
): FavoriteButtonSizeStyles {
  return FAVORITE_BUTTON_SIZE_STYLES[size] ?? FAVORITE_BUTTON_SIZE_STYLES[DEFAULT_POS_FAVORITE_BUTTON_SIZE];
}
