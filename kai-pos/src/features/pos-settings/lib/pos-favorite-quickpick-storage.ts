import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export type PosFavoriteButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export const POS_FAVORITE_BUTTON_SIZE_LS_KEY = "kai.posFavoriteQuickPick.buttonSize";
export const POS_FAVORITE_BUTTON_SIZE_LS_KEY_LEGACY =
  "flowstore.posFavoriteQuickPick.buttonSize";

export const POS_FAVORITE_BUTTON_SIZES: PosFavoriteButtonSize[] = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
];

export const DEFAULT_POS_FAVORITE_BUTTON_SIZE: PosFavoriteButtonSize = "xs";

export const POS_FAVORITE_UI_CHANGED_EVENT = "pos-favorite-ui-changed";

export function normalizePosFavoriteButtonSize(
  raw: string | null | undefined,
): PosFavoriteButtonSize {
  const value = raw?.trim().toLowerCase();
  if (value && (POS_FAVORITE_BUTTON_SIZES as readonly string[]).includes(value)) {
    return value as PosFavoriteButtonSize;
  }
  return DEFAULT_POS_FAVORITE_BUTTON_SIZE;
}

export function readPosFavoriteButtonSize(): PosFavoriteButtonSize {
  if (typeof window === "undefined") {
    return DEFAULT_POS_FAVORITE_BUTTON_SIZE;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      POS_FAVORITE_BUTTON_SIZE_LS_KEY,
      POS_FAVORITE_BUTTON_SIZE_LS_KEY_LEGACY,
    );
    return normalizePosFavoriteButtonSize(raw);
  } catch {
    return DEFAULT_POS_FAVORITE_BUTTON_SIZE;
  }
}

export function writePosFavoriteButtonSize(size: PosFavoriteButtonSize): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = normalizePosFavoriteButtonSize(size);
  try {
    setMigratedLocalStorageItem(
      POS_FAVORITE_BUTTON_SIZE_LS_KEY,
      POS_FAVORITE_BUTTON_SIZE_LS_KEY_LEGACY,
      normalized,
    );
    notifyPosFavoriteUiChanged();
  } catch {
    // quota / private mode
  }
}

export function notifyPosFavoriteUiChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POS_FAVORITE_UI_CHANGED_EVENT));
}

export const POS_FAVORITE_BUTTON_SIZE_LABELS: Record<
  PosFavoriteButtonSize,
  string
> = {
  xs: "Muy pequeño (XS)",
  sm: "Pequeño (SM)",
  md: "Mediano (MD)",
  lg: "Grande (LG)",
  xl: "Muy grande (XL)",
};
