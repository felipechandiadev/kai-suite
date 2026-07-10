"use client";

import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";
import type { PosFavoriteButtonSize } from "../lib/pos-favorite-quickpick-storage";
import { getFavoriteButtonSizeStyles } from "../lib/pos-favorite-quickpick-styles";

type Props = {
  size: PosFavoriteButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  "data-test-id"?: string;
} & (
  | { item: PosProductSearchItem; label?: never }
  | { label: string; item?: never }
);

export function PosFavoriteQuickPickChip({
  size,
  disabled = false,
  onClick,
  "data-test-id": testId,
  item,
  label,
}: Props) {
  const styles = getFavoriteButtonSizeStyles(size);
  const canPick = !disabled && !!onClick;

  return (
    <button
      type="button"
      disabled={!canPick}
      onClick={onClick}
      className={`shrink-0 rounded-md border text-left transition-colors ${styles.chipClass} ${
        canPick
          ? "border-border bg-surface hover:border-secondary active:bg-secondary/10"
          : "cursor-default border-border bg-surface opacity-80"
      }`}
      data-test-id={testId}
    >
      {item ? (
        <PosProductNameWithAttributes
          name={item.productName}
          attributes={item.attributes}
          attributeSeparator="slash"
          className={`line-clamp-2 font-medium leading-tight text-foreground ${styles.textClass}`}
        />
      ) : (
        <span
          className={`line-clamp-2 font-medium leading-tight text-foreground ${styles.textClass}`}
        >
          {label}
        </span>
      )}
    </button>
  );
}
